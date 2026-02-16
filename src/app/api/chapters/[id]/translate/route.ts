import { NextResponse } from 'next/server'
import { proxyToBackend } from '../../../_proxy'
import chVenture01 from '@/data/mock-api/content/ch-venture-01.json'
import chNexus01 from '@/data/mock-api/content/ch-nexus-01.json'
import chEvolution01 from '@/data/mock-api/content/ch-evolution-01.json'
import chIran01 from '@/data/mock-api/content/ch-iran-01.json'
import trVenture01 from '@/data/mock-api/translations/ch-venture-01.json'
import trNexus01 from '@/data/mock-api/translations/ch-nexus-01.json'
import trEvolution01 from '@/data/mock-api/translations/ch-evolution-01.json'
import trIran01 from '@/data/mock-api/translations/ch-iran-01.json'

const contentMap: Record<string, unknown[]> = {
  'ch-venture-01': chVenture01,
  'ch-nexus-01': chNexus01,
  'ch-evolution-01': chEvolution01,
  'ch-iran-01': chIran01,
}

const translationsMap: Record<string, Record<string, Record<string, unknown>>> = {
  'ch-venture-01': trVenture01 as Record<string, Record<string, unknown>>,
  'ch-nexus-01': trNexus01 as Record<string, Record<string, unknown>>,
  'ch-evolution-01': trEvolution01 as Record<string, Record<string, unknown>>,
  'ch-iran-01': trIran01 as Record<string, Record<string, unknown>>,
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const { id } = await params
  const content = contentMap[id]
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const lang = (body.lang as string)?.toUpperCase()
  const blockIds = body.blockIds as string[]

  if (!lang || !Array.isArray(blockIds)) {
    return NextResponse.json({ error: 'lang and blockIds are required' }, { status: 400 })
  }

  const langTranslations = translationsMap[id]?.[lang] ?? {}
  const blockIdSet = new Set(blockIds)

  const result = content
    .filter((block) => blockIdSet.has((block as Record<string, unknown>).id as string))
    .map((block) => {
      const b = block as Record<string, unknown>
      if (b.type === 'hr' || b.type === 'image') return b

      const translation = langTranslations[b.id as string]
      if (translation === undefined) return b

      if (b.type === 'list') return { ...b, items: translation }
      return { ...b, text: translation }
    })

  return NextResponse.json(result)
}
