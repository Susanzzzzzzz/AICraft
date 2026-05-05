// Prefab registry — loads all prefab JSON data for use in world generation
// esbuild bundles JSON imports automatically
import cabin from '../data/prefabs/cabin.json';
import watchtower from '../data/prefabs/watchtower.json';
import mineEntrance from '../data/prefabs/mine_entrance.json';
import pyramid from '../data/prefabs/pyramid.json';
import swampHut from '../data/prefabs/swamp_hut.json';
import igloo from '../data/prefabs/igloo.json';
import sakuraPavilion from '../data/prefabs/sakura_pavilion.json';

import rocks from '../data/prefabs/rocks.json';
import deadTree from '../data/prefabs/dead_tree.json';
import well from '../data/prefabs/well.json';
import bush from '../data/prefabs/bush.json';
import mushroom from '../data/prefabs/mushroom.json';
import cactusCluster from '../data/prefabs/cactus_cluster.json';
import fountain from '../data/prefabs/fountain.json';
import tent from '../data/prefabs/tent.json';
import lampPost from '../data/prefabs/lamp_post.json';

// File name (without .json) → prefab data lookup
export const PREFAB_REGISTRY = {
  cabin,
  watchtower,
  mine_entrance: mineEntrance,
  pyramid,
  swamp_hut: swampHut,
  igloo,
  sakura_pavilion: sakuraPavilion,
  rocks,
  dead_tree: deadTree,
  well,
  bush,
  mushroom,
  cactus_cluster: cactusCluster,
  fountain,
  tent,
  lamp_post: lampPost,
};

/**
 * Lookup a prefab by file name (without .json extension).
 * @param {string} name - e.g. 'cabin', 'watchtower'
 * @returns {object|null} The prefab data object or null if not found
 */
export function getPrefab(name) {
  return PREFAB_REGISTRY[name] || null;
}
