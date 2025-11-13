"use client"

import { Control, FieldErrors, UseFormRegister, useWatch } from "react-hook-form"
import { FileIcon, LinkIcon, FileTextIcon } from "lucide-react"
import { FormSection } from "@/components/ui/form-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"

interface CreateSourceFormData {
  type: 'link' | 'upload' | 'text'
  title?: string
  url?: string
  content?: string
  file?: FileList | File
  notebooks?: string[]
  transformations?: string[]
  embed: boolean
  async_processing: boolean
}

interface SourceTypeStepProps {
  control: Control<CreateSourceFormData>
  register: UseFormRegister<CreateSourceFormData>
  errors: FieldErrors<CreateSourceFormData>
}

export function SourceTypeStep({ control, register, errors }: SourceTypeStepProps) {
  const { t } = useTranslation()
  // Watch the selected type to make title conditional
  const selectedType = useWatch({ control, name: 'type' })
  
  const SOURCE_TYPES = [
    {
      value: 'link' as const,
      label: t('sources.addSourceDialog.sourceType.link'),
      icon: LinkIcon,
      description: t('sources.addSourceDialog.sourceType.linkDesc'),
    },
    {
      value: 'upload' as const,
      label: t('sources.addSourceDialog.sourceType.upload'),
      icon: FileIcon,
      description: t('sources.addSourceDialog.sourceType.uploadDesc'),
    },
    {
      value: 'text' as const,
      label: t('sources.addSourceDialog.sourceType.text'),
      icon: FileTextIcon,
      description: t('sources.addSourceDialog.sourceType.textDesc'),
    },
  ]
  
  return (
    <div className="space-y-6">
      <FormSection
        title={t('sources.addSourceDialog.sourceType.title')}
        description={t('sources.addSourceDialog.sourceType.description')}
      >
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Tabs 
              value={field.value || ''} 
              onValueChange={(value) => field.onChange(value as 'link' | 'upload' | 'text')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                {SOURCE_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <TabsTrigger key={type.value} value={type.value} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              
              {SOURCE_TYPES.map((type) => (
                <TabsContent key={type.value} value={type.value} className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
                  
                  {/* Type-specific fields */}
                  {type.value === 'link' && (
                    <div>
                      <Label htmlFor="url" className="mb-2 block">{t('sources.addSourceDialog.sourceType.urlLabel')}</Label>
                      <Input
                        id="url"
                        {...register('url')}
                        placeholder={t('sources.addSourceDialog.sourceType.urlPlaceholder')}
                        type="url"
                      />
                      {errors.url && (
                        <p className="text-sm text-destructive mt-1">{errors.url.message}</p>
                      )}
                    </div>
                  )}
                  
                  {type.value === 'upload' && (
                    <div>
                      <Label htmlFor="file" className="mb-2 block">{t('sources.addSourceDialog.sourceType.fileLabel')}</Label>
                      <Input
                        id="file"
                        type="file"
                        {...register('file')}
                        accept=".pdf,.doc,.docx,.pptx,.ppt,.xlsx,.xls,.txt,.md,.epub,.mp4,.avi,.mov,.wmv,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.tiff,.zip,.tar,.gz,.html"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('sources.addSourceDialog.sourceType.fileSupported')}
                      </p>
                      {errors.file && (
                        <p className="text-sm text-destructive mt-1">{errors.file.message}</p>
                      )}
                    </div>
                  )}
                  
                  {type.value === 'text' && (
                    <div>
                      <Label htmlFor="content" className="mb-2 block">{t('sources.addSourceDialog.sourceType.contentLabel')}</Label>
                      <Textarea
                        id="content"
                        {...register('content')}
                        placeholder={t('sources.addSourceDialog.sourceType.contentPlaceholder')}
                        rows={6}
                      />
                      {errors.content && (
                        <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        />
        {errors.type && (
          <p className="text-sm text-destructive mt-1">{errors.type.message}</p>
        )}
      </FormSection>

      <FormSection
        title={selectedType === 'text' ? t('sources.addSourceDialog.sourceType.titleRequired') : t('sources.addSourceDialog.sourceType.titleOptional')}
        description={selectedType === 'text'
          ? t('sources.addSourceDialog.sourceType.titleRequiredDesc')
          : t('sources.addSourceDialog.sourceType.titleOptionalDesc')
        }
      >
        <Input
          id="title"
          {...register('title')}
          placeholder={t('sources.addSourceDialog.sourceType.titlePlaceholder')}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </FormSection>
    </div>
  )
}
