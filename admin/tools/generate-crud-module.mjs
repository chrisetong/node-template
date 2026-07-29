import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function getArg(name, fallback = '') {
  const target = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (!target) return fallback
  return target.slice(name.length + 3)
}

function toPascalCase(input) {
  return input
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

const moduleName = getArg('name')
const title = getArg('title', moduleName)
const resource = getArg('resource', moduleName)

if (!moduleName) {
  console.error('Usage: pnpm run gen:module -- --name=friend-links --title=友情链接管理 --resource=friendLink')
  process.exit(1)
}

const pascalName = toPascalCase(moduleName)
const kebabName = moduleName.trim().replace(/\s+/g, '-')
const viewsDir = join(process.cwd(), 'src', 'views', 'admin')
const metaPath = join(viewsDir, `${kebabName}.meta.ts`)
const viewPath = join(viewsDir, `${pascalName}.vue`)

if (!existsSync(viewsDir)) {
  mkdirSync(viewsDir, { recursive: true })
}

if (existsSync(metaPath) || existsSync(viewPath)) {
  console.error(`[gen:module] aborted, file exists: ${metaPath} or ${viewPath}`)
  process.exit(1)
}

const metaCode = `import { api } from '../../api'
import type { CommonColumn } from '../../components/common/CommonTable.vue'
import type { CommonField } from '../../components/common/CommonForm.vue'
import type { GenericCrudMeta } from '../../components/common/generic-crud'

type ${pascalName}Row = {
  id: number
  name: string
  url?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const columns: CommonColumn[] = [
  { label: '名称', key: 'name', type: 'text' },
  { label: '链接', key: 'url', type: 'text' },
  { label: '启用', key: 'enabled', type: 'boolean' },
  { label: '创建时间', key: 'createdAt', type: 'date' },
]

const schema = {
  safeParse: (raw: any) => {
    const values = raw ?? {}
    const name = typeof values.name === 'string' ? values.name.trim() : ''
    const url = typeof values.url === 'string' ? values.url.trim() : ''
    const enabled = Boolean(values.enabled)

    const fieldErrors: Record<string, string[] | undefined> = {}
    const formErrors: string[] = []
    if (!name) fieldErrors.name = ['请输入名称']

    if (Object.keys(fieldErrors).length || formErrors.length) {
      return { success: false as const, error: { flatten: () => ({ fieldErrors, formErrors }) } }
    }
    return { success: true as const, data: { name, url, enabled } }
  },
  parse: (raw: any) => {
    const res = schema.safeParse(raw)
    if (res.success) return res.data
    throw new Error('表单校验失败')
  },
}

export const ${kebabName.replace(/-([a-z])/g, (_, g) => g.toUpperCase())}Meta: GenericCrudMeta<${pascalName}Row> = {
  title: '${title}',
  description: '由自动化产线脚手架生成，请按业务补充字段与校验规则。',
  columns,
  searchFields: ['name'],
  validationRules: ['name: required'],
  createPermission: '${resource}:create',
  deletePermission: '${resource}:delete',
  formTitleCreate: '新增${title}',
  formTitleEdit: '编辑${title}',
  fields: () =>
    [
      { name: 'name', label: '名称', type: 'input', placeholder: '请输入名称' },
      { name: 'url', label: '链接', type: 'input', placeholder: 'https://example.com' },
      { name: 'enabled', label: '是否启用', type: 'switch' },
    ] as CommonField[],
  schema,
  initialModel: () => ({ name: '', url: '', enabled: true }),
  mapRowToModel: (row) => ({ name: row.name, url: row.url ?? '', enabled: row.enabled }),
  load: async (params) => {
    const { data } = await api.get<{ items: ${pascalName}Row[]; total: number }>('/${resource}', { params })
    return { items: data.items ?? [], total: data.total ?? 0 }
  },
  create: async (payload) => {
    await api.post('/${resource}', payload)
  },
  update: async (id, payload) => {
    await api.patch('/${resource}/' + id, payload)
  },
  remove: async (row) => {
    await api.delete('/${resource}/' + row.id)
  },
}
`

const viewCode = `<script setup lang="ts">
import GenericCRUD from '../../components/common/GenericCRUD.vue'
import { ${kebabName.replace(/-([a-z])/g, (_, g) => g.toUpperCase())}Meta } from './${kebabName}.meta'
</script>

<template>
  <GenericCRUD :meta="${kebabName.replace(/-([a-z])/g, (_, g) => g.toUpperCase())}Meta" />
</template>
`

writeFileSync(metaPath, metaCode, 'utf8')
writeFileSync(viewPath, viewCode, 'utf8')

console.log(`[gen:module] created ${metaPath}`)
console.log(`[gen:module] created ${viewPath}`)
