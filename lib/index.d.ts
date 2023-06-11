import Metalsmith from "metalsmith";

export default metadata;
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
 */
declare function metadata(options?: Options): Metalsmith.Plugin;
