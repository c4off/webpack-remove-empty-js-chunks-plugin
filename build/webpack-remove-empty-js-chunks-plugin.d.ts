import { Compiler } from 'webpack';
interface PluginOptions {
    silent: boolean;
    preserveEmptyAssets: boolean;
}
export declare class WebpackRemoveEmptyJSChunksPlugin {
    private _options;
    private _name;
    private _excludeChunks;
    constructor(options?: PluginOptions);
    apply(compiler: Compiler): void;
}
export {};
