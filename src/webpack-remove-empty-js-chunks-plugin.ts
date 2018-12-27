import { Compiler, compilation } from 'webpack';
import { SyncWaterfallHook} from "tapable";
import MainTemplate = compilation.MainTemplate;

interface PluginOptions {
	silent: boolean;
	preserveEmptyAssets: boolean;
}
type ExcludeChunksMap = {
	[index: string]: string;
}

type ExcludeChunksFilesMap = {
	[index: string]: number;
}

interface MainTemplateHooks {
	require: SyncWaterfallHook;
	requireEnsure: SyncWaterfallHook;
}

interface WP4MainTemplate extends MainTemplate {
	hooks: MainTemplateHooks;
}

const defaultOptions: PluginOptions = {
	silent: true,
	preserveEmptyAssets: false,
};

export class WebpackRemoveEmptyJSChunksPlugin {
	private _options: PluginOptions;
	private _name: string = 'webpack-remove-empty-js-chunks-plugin';
	private _excludeChunks: ExcludeChunksMap;

	public constructor(options?: PluginOptions) {
		this._options = Object.assign({}, defaultOptions, options);
		this._excludeChunks = {};
	}

	apply(compiler: Compiler) {
		compiler.hooks.thisCompilation.tap(this._name, (compilation: compilation.Compilation) => {
			(compilation.mainTemplate as WP4MainTemplate).hooks.require.tap(this._name, () => {
				(compilation.mainTemplate as WP4MainTemplate).hooks.requireEnsure.tap(this._name, (source) => {
					compilation.chunks.forEach((chunk: any) => {
						const chunkModules = chunk.getModules();
						if (!chunkModules.length) {
							return;
						}
						const isMixedModulesChunk = chunk.getModules()
							.some((module: any)=> module.type !== 'css/mini-extract');
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
					// we may have already updated the source
					if (strParts.length === 1) {
						return source;
					}
					const excludeChunksFiles: ExcludeChunksFilesMap = {};
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