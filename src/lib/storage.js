import ScratchStorage from '@turbowarp/scratch-storage';

import defaultProject from './default-project';
import {ourAssetUrl} from './kishufiya-assets';

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor () {
        super();
        this.cacheDefaultProject();
    }
    addOfficialScratchWebStores () {
        // Scratch independence: no project store and no Scratch asset host. A project comes to the
        // editor from the platform (kishufiya.jsx) and library files from the platform's store only.
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            asset => ourAssetUrl(`${asset.assetId}.${asset.dataFormat}`)
        );
    }
    setTranslatorFunction (translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject () {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
