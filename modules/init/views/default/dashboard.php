<?php 

use yii\helpers\Html;
use yii\helpers\Url;
use app\controllers\RbacController;

?>

<div class="dashboard">
		<?php if(RbacController::can("reservation/create")): ?>
        <div>
            <h2><?= Yii::t('init', 'New Reservation'); ?></h2>
            <a href="<?= Url::to(['/circuits/reservation/create']); ?>">
                <img style="width: 128px; height:128px;" src="<?= Url::to('@web/images/dash_new_reservation.png'); ?>" alt="New Reservation"/>
            </a>
        </div>
        <?php endif; ?>
        <?php if(RbacController::can("reservation/read")): ?>
         <div>
            <h2><?= Yii::t('init', 'Reservations'); ?></h2>
            <a href="<?= Url::to(['/circuits/reservation/status']); ?>">
                <img style="width: 128px; height:128px;" src="<?= Url::to('@web/images/dash_reservations.png'); ?>" alt="Reservations"/>
            </a>
        </div>
        <?php endif; ?>
        <?php if(RbacController::can("user/read")): ?>
         <div>
            <h2><?= Yii::t('init', 'Users'); ?></h2>
            <a href="<?= Url::to(['/aaa/user']); ?>">
                <img style="width: 128px; height:128px;" src="<?= Url::to('@web/images/dash_users.png'); ?>" alt="Users"/>
            </a>
        </div>
        <?php endif; ?>
        <?php if(RbacController::can("reservation/read")): ?>
         <div>
            <h2><?= Yii::t('init', 'Authorizations'); ?></h2>
            <a href="<?= Url::to(['/circuits/authorization/index']); ?>">
                <img style="width: 128px; height:128px;" src="<?= Url::to('@web/images/dash_authorizations.png'); ?>" alt="Authorizations"/>
            </a>
        </div>
        <?php endif; ?>
</div>