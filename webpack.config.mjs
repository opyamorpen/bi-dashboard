import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'

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
 * @param {import('webpack').Configuration} config
 * @param {import('@ones-op/rc-cli').WebpackConfigPipelineContext} context
 * @returns {import('webpack').Configuration}
 */
export default function defineWebpackConfig(config, context) {
  const plugins = config.plugins || []
  // Only add DefinePlugin if webpack is available via context
  // Don't import webpack directly — rc-cli provides it
  try {
    const webpack = require('webpack')
    config.plugins = [
      new webpack.DefinePlugin({
        'process.env.FRONTEND_CUSTOM_VALUE': JSON.stringify('frontend-custom-value'),
        'process.env.VERSION': JSON.stringify(version),
        'process.env.MODULE_ABOUT_BLANK_ID_ARRAY': JSON.stringify(moduleAboutBlankIDArray),
      }),
      ...plugins,
    ]
  } catch {
    // Fallback: just use existing plugins
    config.plugins = plugins
  }
  return config
}
