'use client'

import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { SpeechScriptDetail } from '@/components/speech-scripts/SpeechScriptDetail'

export default function SpeechScriptDetailPage() {
  const params = useParams()
  const speechScriptId = params.id as string

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <SpeechScriptDetail speechScriptId={speechScriptId} />
        </div>
      </div>
    </AppShell>
  )
}



