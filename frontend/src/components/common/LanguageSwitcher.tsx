'use client'

import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  iconOnly?: boolean;
}

export const LanguageSwitcher = ({ iconOnly = false }: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language || 'en';

  const changeLanguage = (locale: string) => {
    if (locale === currentLocale) return;
    
    // 更新 i18n 语言
    i18n.changeLanguage(locale);
    
    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  };

  const languageDisplay = currentLocale === 'zh' ? '中文' : 'English';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={iconOnly ? "ghost" : "outline"} 
          size={iconOnly ? "icon" : "default"} 
          className={iconOnly ? "h-9 w-full" : "w-full justify-start gap-2"}
        >
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          {!iconOnly && <span>{languageDisplay}</span>}
          <span className="sr-only">{t('common.language') || 'Language'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => changeLanguage('en')}
            className={cn(
              'cursor-pointer',
              currentLocale === 'en' && 'bg-accent'
            )}
          >
            <span className="mr-2">🇺🇸</span>
            English
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => changeLanguage('zh')}
            className={cn(
              'cursor-pointer',
              currentLocale === 'zh' && 'bg-accent'
            )}
          >
            <span className="mr-2">🇨🇳</span>
            中文
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
