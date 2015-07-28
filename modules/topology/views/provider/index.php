<?php 
    use yii\grid\GridView;
    use yii\grid\CheckboxColumn;
    
    use app\components\LinkColumn;
    
    use yii\helpers\Html;
    
    use yii\widgets\ActiveForm;
    
    use app\modules\topology\assets\ProviderAsset;
    
    ProviderAsset::register($this);
?>

<h1><?= "Providers" ?></h1>
<?php
    $form = ActiveForm::begin([
            'method' => 'post',
            'action' => ['delete'],
            'id' => 'provider-form',  
            'enableClientScript'=>false,
            'enableClientValidation' => false,
    ])
?>
    
<?= $this->render('//formButtons'); ?>

<?=
    GridView::widget([
        'options' => ['class' => 'list'],
        'dataProvider' => $providers,
    	'layout' => "{items}{summary}{pager}",
        'columns' => array(
                array(
                    'class'=>CheckboxColumn::className(),
                    'name'=>'delete',         
                    'checkboxOptions'=>[
                        'class'=>'deleteCheckbox',
                    ],
                    'multiple'=>false,
                    'contentOptions'=>['style'=>'width: 15px;'],
                ),
                array(
                    'class'=> LinkColumn::className(),
                    'image'=>'/images/edit_1.png',
                    'label' => '',
                    'url' => 'update',
                    'contentOptions'=>['style'=>'width: 15px;'],
                ),
                array(
                    'class'=> LinkColumn::className(),
                    'image'=>'/images/eye.png',
                    'label' => '',
                    'title'=>Yii::t("topology",'Show details and services of this provider'),
                    'url' => 'view',
                    'contentOptions'=>['style'=>'width: 15px;'],
                ),
                'name',
                [
                    'attribute'=> 'type',
                    'value' => function($model) {
                        return $model->getType();
                    },
                ],
                'nsa',
                'latitude',
                'longitude',
            ),
    ]);
?>

<?php
    ActiveForm::end();
?>
