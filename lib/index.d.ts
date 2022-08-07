import Metalsmith from "metalsmith";

export default initMetadata;
export type Options = {
  [key: string]: string;
};
/**
 * A Metalsmith plugin to load global metadata from files
 *
 * @example
 * ```js
 * // inside metalsmith.source()
 * metalsmith.use(metadata({ 'config': 'src/config.json' }))
 * // inside metalsmith.directory()
 * metalsmith.use(metadata({ 'config': 'config.json' }))
 * // target a keypath
 * metalsmith.use(metadata({ 'config.nav.items': 'navitems.yaml' }))
 * ```
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
declare function initMetadata(options?: Options): Metalsmith.Plugin;
