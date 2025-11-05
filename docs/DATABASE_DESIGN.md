# Open Notebook 数据库设计和向量库使用分析

本文档详细分析 Open Notebook 项目的数据库设计，特别是知识库和向量库的使用方式。

## 数据库架构概述

Open Notebook 使用 **SurrealDB** 作为主要数据库，支持文档型和图型混合数据模型。

### 数据库连接配置
- **数据库类型**: SurrealDB
- **连接方式**: WebSocket (`ws://host:port/rpc`)
- **认证方式**: 用户名/密码
- **命名空间**: `open_notebook`
- **数据库**: `production`

### 核心数据表结构

## 1. 核心实体表

### source - 资源表
```surrealql
DEFINE TABLE IF NOT EXISTS source SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS asset ON TABLE source FLEXIBLE TYPE option<object>;
DEFINE FIELD IF NOT EXISTS title ON TABLE source TYPE option<string>;
DEFINE FIELD IF NOT EXISTS topics ON TABLE source TYPE option<array<string>>;
DEFINE FIELD IF NOT EXISTS full_text ON TABLE source TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created ON source DEFAULT time::now() VALUE $before OR time::now();
DEFINE FIELD IF NOT EXISTS updated ON source DEFAULT time::now() VALUE time::now();
```

**字段说明**:
- `asset`: 资源文件信息（文件路径或URL）
- `title`: 资源标题
- `topics`: 主题标签数组
- `full_text`: 完整的文本内容
- `created/updated`: 时间戳

### source_embedding - 资源向量嵌入表
```surrealql
DEFINE TABLE IF NOT EXISTS source_embedding SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS source ON TABLE source_embedding TYPE record<source>;
DEFINE FIELD IF NOT EXISTS order ON TABLE source_embedding TYPE int;
DEFINE FIELD IF NOT EXISTS content ON TABLE source_embedding TYPE string;
DEFINE FIELD IF NOT EXISTS embedding ON TABLE source_embedding TYPE array<float>;
```

**字段说明**:
- `source`: 关联的资源ID（外键）
- `order`: 文本块的顺序
- `content`: 文本块内容
- `embedding`: 向量嵌入数组

### source_insight - 资源洞察表
```surrealql
DEFINE TABLE IF NOT EXISTS source_insight SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS source ON TABLE source_insight TYPE record<source>;
DEFINE FIELD IF NOT EXISTS insight_type ON TABLE source_insight TYPE string;
DEFINE FIELD IF NOT EXISTS content ON TABLE source_insight TYPE string;
DEFINE FIELD IF NOT EXISTS embedding ON TABLE source_insight TYPE array<float>;
```

**字段说明**:
- `source`: 关联的资源ID
- `insight_type`: 洞察类型
- `content`: 洞察内容
- `embedding`: 向量嵌入

### note - 笔记表
```surrealql
DEFINE TABLE IF NOT EXISTS note SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS title ON TABLE note TYPE option<string>;
DEFINE FIELD IF NOT EXISTS summary ON TABLE note TYPE option<string>;
DEFINE FIELD IF NOT EXISTS content ON TABLE note TYPE option<string>;
DEFINE FIELD IF NOT EXISTS note_type ON TABLE note TYPE option<string>;
DEFINE FIELD IF NOT EXISTS embedding ON TABLE note TYPE array<float>;
```

**字段说明**:
- `title`: 笔记标题
- `content`: 笔记内容
- `note_type`: 笔记类型（human/ai）
- `embedding`: 向量嵌入

### notebook - 笔记本表
```surrealql
DEFINE TABLE IF NOT EXISTS notebook SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name ON TABLE notebook TYPE string;
DEFINE FIELD IF NOT EXISTS description ON TABLE notebook TYPE option<string>;
DEFINE FIELD IF NOT EXISTS archived ON TABLE notebook TYPE option<bool> DEFAULT False;
```

**字段说明**:
- `name`: 笔记本名称
- `description`: 描述
- `archived`: 是否归档

### chat_session - 聊天会话表
```surrealql
DEFINE TABLE IF NOT EXISTS chat_session SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS title ON TABLE chat_session TYPE option<string>;
DEFINE FIELD IF NOT EXISTS model_override ON TABLE chat_session TYPE option<string>;
```

**字段说明**:
- `title`: 会话标题
- `model_override`: 模型覆盖设置

## 2. 关系表

### reference - 资源到笔记本的关系
```surrealql
DEFINE TABLE IF NOT EXISTS reference TYPE RELATION FROM source TO notebook;
```

### artifact - 笔记到笔记本的关系
```surrealql
DEFINE TABLE IF NOT EXISTS artifact TYPE RELATION FROM note TO notebook;
```

### refers_to - 聊天会话的关系
```surrealql
DEFINE TABLE OVERWRITE refers_to TYPE RELATION FROM chat_session TO notebook|source;
```

## 3. 播客相关表

### episode_profile - 剧集配置表
```surrealql
DEFINE TABLE IF NOT EXISTS episode_profile SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS description ON TABLE episode_profile TYPE option<string>;
DEFINE FIELD IF NOT EXISTS speaker_config ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS outline_provider ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS outline_model ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS transcript_provider ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS transcript_model ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS default_briefing ON TABLE episode_profile TYPE string;
DEFINE FIELD IF NOT EXISTS num_segments ON TABLE episode_profile TYPE int DEFAULT 5;
```

### speaker_profile - 说话人配置表
```surrealql
DEFINE TABLE IF NOT EXISTS speaker_profile SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name ON TABLE speaker_profile TYPE string;
DEFINE FIELD IF NOT EXISTS tts_provider ON TABLE speaker_profile TYPE string;
DEFINE FIELD IF NOT EXISTS tts_model ON TABLE speaker_profile TYPE string;
DEFINE FIELD IF NOT EXISTS speakers ON TABLE speaker_profile TYPE array<object>;
```

### episode - 播客剧集表
```surrealql
DEFINE TABLE IF NOT EXISTS episode SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name ON TABLE episode TYPE string;
DEFINE FIELD IF NOT EXISTS briefing ON TABLE episode TYPE option<string>;
DEFINE FIELD IF NOT EXISTS episode_profile ON TABLE episode FLEXIBLE TYPE object;
DEFINE FIELD IF NOT EXISTS speaker_profile ON TABLE episode FLEXIBLE TYPE object;
DEFINE FIELD IF NOT EXISTS transcript ON TABLE episode FLEXIBLE TYPE option<object>;
DEFINE FIELD IF NOT EXISTS outline ON TABLE episode FLEXIBLE TYPE option<object>;
DEFINE FIELD IF NOT EXISTS command ON TABLE episode TYPE option<record<command>>;
DEFINE FIELD IF NOT EXISTS content ON TABLE episode TYPE option<string>;
DEFINE FIELD IF NOT EXISTS audio_file ON TABLE episode TYPE option<string>;
```

## 向量库设计和实现

### 1. 向量嵌入存储策略

Open Notebook 采用 **混合存储策略** 来处理向量数据：

#### 分块存储策略（source_embedding表）
- **适用对象**: 长文档资源
- **分块机制**: 使用 `split_text()` 函数将文档分割成适当大小的块
- **存储方式**: 每个块独立存储，包含顺序信息
- **优势**: 支持精确的语义搜索，减少上下文丢失

#### 整体存储策略（note表和source_insight表）
- **适用对象**: 笔记和洞察
- **存储方式**: 直接对完整内容生成向量
- **优势**: 保持内容完整性，适合短文本

### 2. 向量搜索实现

#### 文本搜索函数
```surrealql
DEFINE FUNCTION IF NOT EXISTS fn::text_search($query_text: string, $match_count: int, $sources:bool, $show_notes:bool) {
    // 多表联合搜索
    // 支持BM25算法的全文检索
    // 返回相关性和高亮内容
}
```

#### 向量搜索函数
```surrealql
DEFINE FUNCTION IF NOT EXISTS fn::vector_search($query: array<float>, $match_count: int, $sources: bool, $show_notes: bool, $min_similarity: float) {
    // 余弦相似度计算
    // 多表联合向量搜索
    // 支持相似度阈值过滤
}
```

### 3. 向量处理流程

#### 文档向量化流程
```
1. 文档上传 → 2. 文本提取 → 3. 文本分块 → 4. 向量生成 → 5. 存储到数据库
```

#### 异步处理机制
- 使用 `surreal-commands` 实现后台向量处理
- 支持并发处理多个文档块
- 实现重试机制处理网络超时

#### 具体实现步骤：

1. **提交向量化任务**
   ```python
   command_id = submit_command("open_notebook", "vectorize_source", {"source_id": source_id})
   ```

2. **文本分块处理**
   ```python
   chunks = split_text(source.full_text)
   ```

3. **批量提交嵌入任务**
   ```python
   for idx, chunk_text in enumerate(chunks):
       submit_command("open_notebook", "embed_chunk", {
           "source_id": source_id,
           "chunk_index": idx,
           "chunk_text": chunk_text
       })
   ```

4. **向量嵌入生成**
   ```python
   embedding = await EMBEDDING_MODEL.aembed([chunk_text])
   ```

5. **存储到数据库**
   ```surrealql
   CREATE source_embedding CONTENT {
       "source": $source_id,
       "order": $order,
       "content": $content,
       "embedding": $embedding
   }
   ```

### 4. 搜索策略

#### 双重搜索机制
Open Notebook 实现了 **全文搜索 + 向量搜索** 的双重机制：

1. **全文搜索** (`fn::text_search`):
   - 使用 BM25 算法
   - 支持关键词高亮
   - 快速精确匹配

2. **向量搜索** (`fn::vector_search`):
   - 使用余弦相似度
   - 支持语义搜索
   - 处理同义词和概念匹配

#### 混合搜索流程
```
用户查询 → 文本预处理 → 并行执行全文和向量搜索 → 结果融合 → 返回排序结果
```

## 索引和性能优化

### 全文搜索索引
```surrealql
DEFINE ANALYZER IF NOT EXISTS my_analyzer TOKENIZERS blank,class,camel,punct FILTERS snowball(english), lowercase;
DEFINE INDEX IF NOT EXISTS idx_source_title ON TABLE source COLUMNS title SEARCH ANALYZER my_analyzer BM25 HIGHLIGHTS;
DEFINE INDEX IF NOT EXISTS idx_source_full_text ON TABLE source COLUMNS full_text SEARCH ANALYZER my_analyzer BM25 HIGHLIGHTS;
```

### 唯一索引
```surrealql
DEFINE INDEX IF NOT EXISTS idx_episode_profile_name ON TABLE episode_profile COLUMNS name UNIQUE CONCURRENTLY;
DEFINE INDEX IF NOT EXISTS idx_speaker_profile_name ON TABLE speaker_profile COLUMNS name UNIQUE CONCURRENTLY;
```

## 数据完整性和约束

### 级联删除机制
```surrealql
DEFINE EVENT IF NOT EXISTS source_delete ON TABLE source WHEN ($after == NONE) THEN {
    delete source_embedding where source == $before.id;
    delete source_insight where source == $before.id;
};
```

### 外键约束
- 通过 `record<>` 类型确保引用完整性
- 使用关系表维护实体间关联

## 迁移策略

### 增量迁移
项目使用9个版本的增量迁移：
- `1.surrealql`: 基础表结构和搜索函数
- `2.surrealql`: 添加笔记类型字段
- `3.surrealql`: 添加聊天会话和改进向量搜索
- `4.surrealql`: 优化搜索函数
- `5.surrealql`: 添加转换系统
- `6.surrealql`: 模型提供商更新
- `7.surrealql`: 添加播客相关表
- `8.surrealql`: 扩展聊天会话关系
- `9.surrealql`: 最终优化向量搜索

### 自动迁移
系统启动时自动检测并运行待处理的迁移，确保数据库版本一致性。

## 性能特点

### 并发处理
- 使用 `surreal-commands` 实现异步任务处理
- 支持高并发向量嵌入生成
- 避免HTTP连接池耗尽

### 存储优化
- 分块存储减少内存占用
- 按需加载相关数据
- 索引优化查询性能

### 可扩展性
- 向量维度可配置
- 支持多种嵌入模型
- 关系型数据模型易于扩展

## 总结

Open Notebook 的数据库设计展现了以下特点：

1. **混合数据模型**: 结合文档、关系和向量数据类型
2. **智能搜索**: 全文搜索 + 向量搜索的双重机制
3. **异步处理**: 后台任务处理避免阻塞主线程
4. **性能优化**: 索引、分块存储和并发处理
5. **可扩展架构**: 支持多种AI模型和内容格式

这种设计既保证了数据的完整性和查询性能，又为AI驱动的功能提供了强大的底层支持。
