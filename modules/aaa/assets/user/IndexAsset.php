<?php
/**
 * @copyright Copyright (c) 2012-2016 RNP
 * @license http://github.com/ufrgs-hyman/meican2#license
 */

namespace meican\aaa\assets\user;

use yii\web\AssetBundle;

/**
 * @author Maurício Quatrin Guerreiro @mqgmaster
 */
class IndexAsset extends AssetBundle
{
    public $sourcePath = '@meican/aaa/assets/user/public';
    
    public $js = [
        'index.js',
    ];
    
    public $depends = [
        'meican\base\assets\Theme',
    ];
}