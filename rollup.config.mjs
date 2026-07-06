import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginYamlPath = join(__dirname, 'config', 'plugin.yaml')
const pluginConfig = load(readFileSync(pluginYamlPath, 'utf8'))
const version = pluginConfig?.service?.version ?? ''
const moduleAboutBlankIDArray =
  pluginConfig?.modules
    ?.filter((module) => module?.moduleType === 'about:blank')
    ?.map((module) => module?.id)
    ?.filter((id) => id != null && id !== '') ?? []

/**
 * @param {import('rollup').RollupOptions} config
 * @param {import('@ones-op/rc-cli').RollupConfigPipelineContext} context
 * @returns {import('rollup').RollupOptions}
 */
export default function defineRollupConfig(config, context) {
  const plugins = config.plugins || []

  // Replace rpt2's broken filter with a working TS transform
  // rpt2 0.32.1 + @rollup/pluginutils 5.x = filter() returns undefined → no transform
  const newPlugins = plugins.map((p) => {
    if (p && p.name === 'rpt2') {
      return {
        name: 'rpt2',
        transform(code, id) {
          if (!id.endsWith('.ts') && !id.endsWith('.tsx')) return undefined
          try {
            const result = ts.transpileModule(code, {
              compilerOptions: {
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.CommonJS,
                esModuleInterop: true,
                skipLibCheck: true,
                strict: false,
                noImplicitAny: false,
              },
              fileName: id,
            })
            return { code: result.outputText, map: result.sourceMapText }
          } catch (e) {
            console.error('[rollup] TS transform error for', id, ':', e.message)
            return undefined
          }
        },
      }
    }
    return p
  })

  config.plugins = [
    ...newPlugins,
  ]
  return config
}
