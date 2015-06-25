<?php

namespace app\modules\circuits\controllers;

use app\components\AggregatorSoapClient;
use yii\helpers\Url;
use Yii;
use yii\web\Controller;
use app\modules\circuits\CircuitsModule;
use app\models\Connection;
use app\models\ConnectionPath;
use app\models\Urn;
use app\models\Domain;
use app\models\Provider;
use app\models\Aggregator;

/*
 * Serviço de Conexões.
 * 
 * Troca mensagens com o aggregator ou nsi-bridge para criar, alterar 
 * ou remover a conexão associada a reserva ou as conexões associadas
 * a recorrência de uma reserva.
 */

class ConnectionController extends Controller {
	
	public $enableCsrfValidation = false;
	
	public function actionIndex() {
		return "";
	}	
	
	public function nsiHeader($params) {
		return "";
	}

	public function actionTest() {
		$prov = Aggregator::findDefault()->one()->getProvider()->one();
		$client = new AggregatorSoapClient($prov->nsa, $prov->connection_url);
    	$client->setAggHeader();
    	$client->querySummary();
	}
	
	public function actionGetOrderedPaths($id) {
		$paths = ConnectionPath::find()->where(['conn_id'=>$id])->orderBy(['path_order'=> "SORT_ASC"])->all();
		 
		$data = [];
		 
		foreach ($paths as $path) {
			$dstUrn = $path->getDestinationUrn()->one();
			$srcUrn = $path->getSourceUrn()->one();
			$data[] = [
				'path_order' => $path->path_order, 
				'src_urn_id'=> $srcUrn ? $srcUrn->id : null,
				'dst_urn_id'=> $dstUrn ? $dstUrn->id : null];
		}
		 
		$data = json_encode($data);
		Yii::trace($data);
		return $data;
	}
	
	//BUG cancelamento multiplo
	public function actionCancel($connections) {
		foreach (json_decode($connections) as $connId) {
			$conn = Connection::findOne($connId);
			if (isset($conn->external_id)) $conn->requestCancel();
		}
		
		return true;
	}
	
	public function dataPlaneStateChange($response) {
		$conn = Connection::find()->where(['external_id'=>$response->connectionId])->one();
		$conn->setActiveDataStatus($response->dataPlaneStatus->active);
		$conn->save();
		
		return "";
	}
	
	public function messageDeliveryTimeout($response) {
		$params = new \stdClass();
		$params->connectionId = $response->connectionId;
	}
	
	public function reserveConfirmed($responseObject){
		$params = new \stdClass();
		$params->connectionId = $responseObject->connectionId;
		
		$conn = Connection::find()->where(['external_id'=>$params->connectionId])->one();
		$conn->confirmCreatePath();
		
		/** Connectivity Log **/
		$log = "Received\n".
				"Connection Id: ".$params->connectionId."\n".
				"Action: reserveConfirmed\n".
				"DateTime: ".date(DATE_RFC822)."\n\n";
		
		Yii::trace($log);
		
		return "";
	}

	
	//Errro conexào nao possui ID nesse momento
	public function reserveFailed($responseObject){
		$params = new \stdClass();
		$params->connectionId = $responseObject->connectionId;
		$connectionStates = $responseObject->connectionStates;
		$serviceException = $responseObject->serviceException;
		
		$conn = Connection::find()->where(['external_id'=>$params->connectionId])->one();
		$conn->failedCreatePath();
		
		/** Connectivity Log **/
		$log = "Received\n".
			   "Connection Id: ".$params->connectionId."\n".
			   "Action: reserveFailed\n".
			   "DateTime: ".date(DATE_RFC822)."\n\n";
		
		Yii::trace($log);
		
		return "";
	}

	public function reserveCommitConfirmed($responseObject){
		$params = new \stdClass();
		$params->connectionId = $responseObject->connectionId;
		
		/** Connectivity Log **/
		$log = "Received\n".
				"Connection Id: ".$params->connectionId."\n".
				"Action: reserveCommitConfirmed\n".
				"DateTime: ".date(DATE_RFC822)."\n\n";
		
		Yii::trace($log);
		
		$conn = Connection::find()->where(['external_id'=>$params->connectionId])->one();
		$conn->confirmCommit();
		
		return "";
	}
	
	public function querySummaryConfirmed($response) {
		if($this->saveConnPath($response)) {
			$connection = Connection::find()->where(['external_id'=>$response->reservation->connectionId])->one();
			$connection->confirmReadPath();
			
		} else {
			
			/////Path invalido
			/////Inconsistencias na topologia
		}
	}
	
	private function saveConnPath($response) {
		$conn = Connection::find()->where(['external_id'=>$response->reservation->connectionId])->one();
		$pathNodes = $response->reservation->criteria->children->child;
		if (count($pathNodes) < 2) {
			$pathNodes = [$pathNodes];
		}
		
		Yii::trace(print_r($pathNodes,true));
		
		foreach ($pathNodes as $pathNode) {
			Yii::trace(print_r($pathNode,true));
			
			$pathNodeXml = $pathNode->any;
			$pathNodeXml = str_replace("<nsi_p2p:p2ps>","<p2p>", $pathNodeXml);
			$pathNodeXml = str_replace("</nsi_p2p:p2ps>","</p2p>", $pathNodeXml);
			$pathNodeXml = '<?xml version="1.0" encoding="UTF-8"?>'.$pathNodeXml;
			$xml = new \DOMDocument();
			$xml->loadXML($pathNodeXml);
			$parser = new \DOMXpath($xml);
			$src = $parser->query("//sourceSTP");
			$dst = $parser->query("//destSTP");
				
			$path = new ConnectionPath;
			$path->conn_id = $conn->id;
			$path->path_order = $pathNode->order;
				
			$path->setSourceStp($src->item(0)->nodeValue);
			$path->setDomainByStp($src->item(0)->nodeValue);
			$path->setDestinationStp($dst->item(0)->nodeValue);
			
			if(!$path->save()) {
				Yii::trace($path);
				return false;
			}
		}
		
		return true;
	}
	
	public function reserveCommitFailed($responseObject){
		$params = new \stdClass();
		$params->connectionId = $responseObject->connectionId;
		$connectionStates = $responseObject->connectionStates;
		$serviceException = $responseObject->serviceException;
		
		$conn = Connection::find()->where(['external_id'=>$params->connectionId])->one();
		$conn->failedCommit();
		
		/** Connectivity Log **/
		$log = "Received\n".
				"Connection Id: ".$params->connectionId."\n".
				"Action: reserveCommitFailed\n".
				"DateTime: ".date(DATE_RFC822)."\n\n";
		
		Yii::trace($log);
		
		return "";
	}
                
	public function provisionConfirmed($responseObject){
		$params = new \stdClass();
		$params->connectionId = $responseObject->connectionId;
		
		$conn = Connection::find()->where(['external_id'=>$params->connectionId])->one();
		$conn->confirmProvision();
		
		/** Connectivity Log **/
		$log = "Received\n".
				"Connection Id: ".$params->connectionId."\n".
				"Action: provisionConfirmed\n".
				"DateTime: ".date(DATE_RFC822)."\n\n";
		
		Yii::trace($log);
		
		return "";
	}
	
	public function terminateConfirmed($responseObject){
		$params = new \stdClass();
		$params->connectionId = $responseObject->connectionId;
		
		$conn = Connection::find()->where(['external_id'=>$params->connectionId])->one();
		$conn->confirmCancel();
		
		/** Connectivity Log **/
		$log = "Received\n".
				"Connection Id: ".$params->connectionId."\n".
				"Action: terminateConfirmed\n".
				"DateTime: ".date(DATE_RFC822)."\n\n";
			
		Yii::trace($log);
		
		return "";
	}
}

$wsdl = Url::to('@web/wsdl/ogf_nsi_connection_requester_v2_0.wsdl', true);

$connection = new \SoapServer($wsdl, array('encoding'=>'UTF-8'));
$connection->setObject(new ConnectionController('connection', CircuitsModule::getInstance()));
$connection->handle();
	
?>