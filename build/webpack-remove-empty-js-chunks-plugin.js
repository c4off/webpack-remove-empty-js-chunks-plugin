"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultOptions = {
    silent: true,
    preserveEmptyAssets: false,
};
class WebpackRemoveEmptyJSChunksPlugin {
    constructor(options) {
        this._name = 'webpack-remove-empty-js-chunks-plugin';
        this._options = Object.assign({}, defaultOptions, options);
        this._excludeChunks = {};
    }
    apply(compiler) {
        compiler.hooks.thisCompilation.tap(this._name, (compilation) => {
            compilation.mainTemplate.hooks.require.tap(this._name, () => {
                compilation.mainTemplate.hooks.requireEnsure.tap(this._name, (source) => {
                    compilation.chunks.forEach((chunk) => {
                        const chunkModules = chunk.getModules();
                        if (!chunkModules.length) {
                            return;
                        }
                        const isMixedModulesChunk = chunk.getModules()
                            .some((module) => module.type !== 'css/mini-extract');
                        if (!isMixedModulesChunk) {
                            this._excludeChunks[chunk.id] = chunk.renderedHash;
                            if (!this._options.silent) {
                                // eslint-disable-next-line no-console
                                console.log(this._name + ': excluding ' + chunk.id + '.' + chunk.renderedHash + '.js' + ', because it\'s empty');
                            }
                        }
                    });
                    const strToSearch = 'if(installedChunkData !== 0) { // 0 means "already installed".';
                    const strParts = source.split(strToSearch);
                    const excludeChunksFiles = {};
                    Object.keys(this._excludeChunks).forEach(chunkId => { excludeChunksFiles[chunkId] = 1; });
                    return strParts[0] +
                        '\n' + 'const excludeFiles = ' + JSON.stringify(excludeChunksFiles) +
                        '\n' + 'if(installedChunkData !== 0 && !excludeFiles[chunkId]) { // 0 means "already installed".' +
                        strParts[1];
                });
            });
        });
        if (!this._options.preserveEmptyAssets) {
            compiler.hooks.emit.tap(this._name, (compilation) => {
                Object.keys(this._excludeChunks).forEach((chunkToExclude) => {
                    const chunkFileName = chunkToExclude + '.' + this._excludeChunks[chunkToExclude] + '.js';
                    delete compilation.assets[chunkFileName];
                });
            });
        }
    }
}
exports.WebpackRemoveEmptyJSChunksPlugin = WebpackRemoveEmptyJSChunksPlugin;
