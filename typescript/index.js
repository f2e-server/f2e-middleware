const { transpileModule } = require('typescript')
const globToRegExp = require('glob-to-regexp')
const path = require('path')
const { existsSync } = require('fs')
const base = path.join(process.cwd(), 'tsconfig.json')
let baseCfg = {}
if (existsSync(base)) {
    baseCfg = require(base)
} else {
    console.warn('tsconfig.json required!')
}
const REG_AMD = /(^define\(|[^.\w]define\()(?!\s*['"])/
const setModuleId = (code, moduleId) => code.replace(REG_AMD, `$1"${moduleId}", `)
module.exports = (conf, options = {}) => {
    const { build } = conf

    const {
        setBefore,
        suffixReg = /\.[jet]sx?/,
        outputSuffix = '.js',
        getModuleId
    } = options

    const {
        include = ['*'],
        exclude = ["node_modules", "bower_components", "jspm_packages"],
        compilerOptions = {}
    } = baseCfg

    const includeReg = include.map(globToRegExp)
    const excludeReg = exclude.map(globToRegExp)
    const includeTest = pathname => !!includeReg.find(r => r.test(pathname))
    const excludeTest = pathname => !!excludeReg.find(r => r.test(pathname))

    const render = function (pathname, data, store) {
        if (suffixReg.test(pathname) && includeTest(pathname) && !excludeTest(pathname)) {
            let result = transpileModule(data.toString(), baseCfg)
            const newPath = pathname.replace(suffixReg, outputSuffix)

            if (getModuleId) {
                let moduleId = getModuleId(pathname.replace(suffixReg, ''))
                result.outputText = setModuleId(result.outputText, moduleId)
            }
            store._set(newPath, result.outputText)

            if (build || newPath === pathname) {
                return result.outputText
            }
        }
    }

    return {
        setBefore,
        onSet: render,
        outputFilter(pathname, data) {
            return /\.js$/.test(pathname) || !suffixReg.test(pathname)
        }
    }
}
