$(document).ready(function() {
	$('#map-canvas').show();
	$('.tab-overlay').show();
	 
	/* quando digita nome, tira overlay */
    $('#res_name').bind('keyup change', function() {
        if ($(this).val())
            $('.tab-overlay').fadeOut();
        else
            $('.tab-overlay').fadeIn();
    }).focus().keyup();
    
    prepareConfirmDialog();
    prepareBandwidthSpinner();
    
    $(".hourPicker").timepicker({
		timeFormat: "H:i",
        step: 30,
	});
});

var sourceMarker;
var destinMarker;
var wayPoints = [];
var map;
var markerCluster;
var circuit;
var currentMarkerType = "net";
var openedWindows = [];
var MARKER_OPTIONS_NET = '' +
'<div><button style="font-size: 11px; width: 48%;" id="set-as-source">' + tt('From here') + '</button>' +
'<button style="font-size: 11px; width: 48%;" id="set-as-dest">' + tt('To here') + '</button></div><div style="height: 2px;"></div>' +
'<div><button style="font-size: 11px; width: 48%;" id="set-as-waypoint">' + tt('Waypoint') + '</button>' +
'<button style="font-size: 11px; width: 48%;" id="set-as-intra">' + tt('Intra-domain') + '</button></div>';
var MARKER_OPTIONS_DEV = '' +
'<div><button style="font-size: 11px; width: 48%;" id="set-as-source">' + tt('From here') + '</button>' +
'<button style="font-size: 11px; width: 48%;" id="set-as-dest">' + tt('To here') + '</button></div><div style="height: 2px;"></div>' +
'<div><button style="font-size: 11px; width: 98%;" id="set-as-waypoint">' + tt('Set as waypoint') + '</button>' +
'</div>';
var MARKER_OPTIONS_END_POINT = '' +
'<button style="font-size: 11px; width: 98%;" id="remove-endpoint">' + tt('Remove endpoint') + '</button>';
var MARKER_OPTIONS_WAY_POINT = '' +
'<button style="font-size: 11px; width: 98%;" id="remove-waypoint">' + tt('Remove waypoint') + '</button>';
var MARKER_OPTIONS_INTRA = '' +
'<button style="font-size: 11px; width: 98%;" id="remove-intra">' + tt('Remove intra-domain circuit') + '</button>';
var devicesLoaded = false;
var shift = 0.01;
var count = shift;

function prepareConfirmDialog() {
	$("#confirm-dialog").dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        appendTo: "#reservation-form",
        buttons: [{
        	id:"confirm-button",
            text: tt('Yes'),
            click: function() {
            	$("#confirm-button").attr("disabled", "disabled");
            	if (validateForm()) {
            		$.ajax({
            	        type: "POST",
            	        url: baseUrl + '/circuits/reservation/request',
            	        data: $("#reservation-form").serialize(),
            	        success: function (resId) {
            	        	if (resId) {
            	        		$.ajax({
            	        			type: "POST",
            	        			url: baseUrl + '/circuits/reservation/confirm', 
            	        			data: {
            	        				id: resId,
            	        			}
                        	    });
                	        	window.location.href = baseUrl + '/circuits/reservation/view?id=' + resId;
            	        	} else {
            	        		showError(tt("Error proccessing your request. Contact your administrator."));
            	        	}
            	        },
            	        error: function() {
            	        	showError(tt("Error proccessing your request. Contact your administrator."));
            	        }
            	    });
            	}
        	}
        },{
        	id:"cancel-button",
            text: tt('No'),
            click: function() {
            	$("#confirm-dialog").dialog( "close" );
            }
        }],
        close: function() {
        	$("#error-confirm-dialog").hide();
        	$("#error-confirm-dialog").html("");
        	$("#confirm-button").attr("disabled", false);
        },
    });
    
    $("#request-button").click(function() {
    	$("#confirm-dialog").dialog("open");
    	return false;
    });
}

function validateForm() {
	var isValid = true;
	var errors = "";
	if (!$("#src-vlan").val() || $("#src-vlan").val() == "null") {
		errors += '<br>- ' + tt('Source end point is undefined or incomplete.');
		isValid = false;
	}
    if (!$("#dst-vlan").val() || $("#dst-vlan").val() == "null") {
		errors += '<br>- ' + tt('Destination end point is undefined or incomplete.');
		isValid = false;
    }
    if ($("#waypoints_order").children('.ui-state-default').length > 0) {
    	var wayPointsItems = $("#waypoints_order").children();
    	for (var i = 0; i < wayPointsItems.length; i++) {
    		var wayPoint = wayPointsItems.children()[0];
    		if (wayPoint.value == 'null' || wayPoint.value == '') {
    			errors += '<br>- ' + tt('Waypoint device information is required.');
        		isValid = false;
    		}
        }
    }
	if (diffDate($("#start-time").val(),$("#finish-time").val(),$("#start-date").val(),$("#finish-date").val()) == false) {
		errors += '<br>- ' + tt('The finish date must be after start date.');
		isValid = false;
	}
	if (isNaN($("#start-time").val().split(":").toString().replace(",","")) || isNaN($("#finish-time").val().split(":").toString().replace(",",""))) {
		errors += '<br>- ' + tt('The start time or the finish time are invalid.');
		isValid = false;
	}
	if (isNaN($("#bandwidth").val()) || parseInt($("#bandwidth").val()) > 1000 || parseInt($("#bandwidth").val()) < 1) {
		errors += '<br>- ' + tt('The bandwidth must be between 1 and 1000.');
		isValid = false;
	}
	
	if(!isValid) {
		showError(tt('Error(s) found') + ":<br>"+errors);
		$("#error-confirm-dialog").show();
	}
	
	return isValid;
}

function showError(message) {
	$("#error-confirm-dialog").html("<br>"+message);
	$("#error-confirm-dialog").show();
}

///////// inicializa bandwith spinner /////////////

function prepareBandwidthSpinner() {
	var f = function() {
        var v = ($("#bandwidth").val() / $("#bandwidth").attr('aria-valuemax')) * 100;
        if (v > 100 || v < 0)
            return;
        var k = 2 * (50 - v);
        $('#bandwidth_bar_inside').animate({
            width: v + '%'
        }, 100);
    };
    $('#bandwidth').attr("min", 100).attr("max", 1000).attr("step", 100).
    		spinner({
    			spin: f,
				stop: f
    }).spinner("disable").bind('spin', f).change(f).keyup(f).click(f).scroll(f);
    $("#bandwidth").val(100);
    f();
    disableBandwidthSpinner();
}

function disableBandwidthSpinner() {
	$("#bandwidth_un").attr("disabled", "disabled");
    $("#bandwidth").spinner('disable');
}

function enableBandwidthSpinner() {
        //var bmin_tmp = (src_min_cap >= dst_min_cap) ? src_min_cap : dst_min_cap;
        //var bmax_tmp = (src_max_cap <= dst_max_cap) ? src_max_cap : dst_max_cap;
        //var bdiv_tmp = (src_div_cap == dst_div_cap) ? src_div_cap : band_div;
        $('#bandwidth').spinner({
            min: 100,
            max: 1000,
            step: 100
        }).spinner("enable").disabled(false).trigger('click');
        $("#bandwidth").trigger("change");
}

/////////////// botoes superiores da tabela origem destino /////////

function toggleEndPointDetails(endPointType) {
	$('#' + endPointType + '-net-row').toggle();
	$('#' + endPointType + '-dev-row').toggle();
	$('#' + endPointType + '-port-row').toggle();
	$('#' + endPointType + '-vlan-row').toggle();
}

function initEndPointButtons(endPointType, markers) {
	$('#' + endPointType + '-show-details').click(function() {
		toggleEndPointDetails(endPointType);
		$('#' + endPointType + '-show-details-icon').toggleClass("ui-icon-carat-1-n");
		$('#' + endPointType + '-show-details-icon').toggleClass("ui-icon-carat-1-s");
    });
	
    $('#' + endPointType + '-select-current-host').click(function() {
    	var currentHostMarker = findCurrentHostMarker(markers);
    	setEndPoint(endPointType, currentHostMarker);
    });
    
    $('#' + endPointType + '-search-host').click(function() {
       // $("#edp_dialog").val($(this).attr('prefix'));
       // clearFlash();
        //$("#edp_dialog_form").dialog("open");
    });
    
    $('#' + endPointType + '-copy-urn').click(function() {
    	openCopyUrnDialog(endPointType);
    });
    
    $("#copy-urn-dialog").dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        width: "auto",
        height: "110",
        beforeClose: function() {
            $("#copy-urn-field").val("");
        }
    });
}

function findCurrentHostMarker(markers) {
	var currentHost = document.URL;
	currentHost = currentHost.split("/")[2].split(".");
	
	if (currentMarkerType == "net") {
		for (var i = 0; i < markers.length; i++) {
	    	if (markers[i].type == "net") {
	    		var domain = markers[i].name; /////// ARRRUMA
	    		domain = domain.split(".");
	    		var equal = true;
	    		var j = domain.length - 1;
    			var k = currentHost.length - 1;
	    		while (j > -1 && k > -1) {
	    			console.log(domain[j] + currentHost[k]);
	    			if (domain[j] == currentHost[k]) {
	    				j--;
	    				k--;
	    			} else {
	    				equal = false;
	    				break;
	    			}
	    		}
	    		if (equal) return markers[i];
	    	}
	    }
	}
	
	alert(tt("Current host is not present in known topology"));
	
	return null;
}

function chooseHost(point) {
    $("#dialog_msg").empty();
    $.fn.mapEdit.clearPoint(point);
    $.ajax({
        type: "POST",
        url: baseUrl + 'circuits/reservations/chooseHost',
        dataType: "json",
        data: {
            edp_reference: $("#edp_reference").val()
        },
        point: point,
        success: function(data) {
            if (data) {
                fillPoint(this.point, data);
            } else {
                setDialogMessage(flash_couldNotGetHost, "error");
            }
        },
        error: function(jqXHR) {
            if (jqXHR.status == 406)
                location.href = baseUrl + 'init/gui';
        }
    });
}

function openCopyUrnDialog(endPointType) {
	$.ajax({
		url: baseUrl+'/topology/urn/get',
		dataType: 'json',
		data: {
			id: $('#' + endPointType + '-port').val(),
		},
		success: function(response){
			$("#copy-urn-field").val(response.value);
		    $("#copy-urn-dialog").dialog("open");
		}
	});
	
}

/////////////// LISTA INTERATIVA DE WAYPOINTS //////////////////////

function enableWayPointsSortable(markers) {
	$("#waypoints_order").sortable({
        update: function(event, ui) {
            var sortableOrder = $(this).sortable('toArray');
            var newWayPoints = [];
            if (currentMarkerType == "net") {
            	for (var i = 0; i < sortableOrder.length; i++) {
                	newWayPoints[i] = getNetworkMarker(markers, parseInt(sortableOrder[i].replace("way","")));
                }
            } else {
    			for (var i = 0; i < sortableOrder.length; i++) {
                	newWayPoints[i] = getDeviceMarker(markers, parseInt(sortableOrder[i].split("-")[1]));
                }
            }

            wayPoints = newWayPoints;
            
            drawCircuit();
        }

    }).css("display", "block");
}

function prepareDialogDeviceSelect(markers, networkWayObject) {
	var network = getNetworkMarker(markers, $(networkWayObject).attr("id").replace("way",""));
	
	if (network.id == $("#waypoint-network-id").text()) {
		enableSelect("waypoint", "device");
		return;
	}
	
	$("#waypoint-network-id").text(network.id);
	
    $("#waypoint-network").html(network.name);
    
    fillDeviceSelect('waypoint', network.id, $(networkWayObject).children(".device-id").val());
}

function setWayPointDevice(networkWayObject) {
	var deviceId = $("#waypoint-device").val();
	var networkName = $(networkWayObject).html().split("(")[0];
	var rest = $(networkWayObject).html().split(")")[1];
	var deviceName = $("#waypoint-device").children("[value=" + deviceId + "]").text();
	if (deviceId != "null") {
		$(networkWayObject).html(networkName + "(" + deviceName + ")" + rest);
	} else {
		$(networkWayObject).html(networkName + "(" + tt("click to select device") + ")" + rest);
	}
	
	$(networkWayObject).children(".device-id").val(deviceId);
	
	disableSelect("waypoint", 'device');
}

function addWayPoint(markers, marker) {
	markerCluster.removeMarker(marker);
	marker.setMap(map);
	marker.circuitMode = "way";
	
	if (wayPoints.length < 1) {
		$("#reservation-waypoints").slideDown(1);
	}
	
	wayPoints.push(marker);
	
	if (marker.type == "net") {
		$("#waypoints_order").append("<li class='ui-state-default opener' id='way" + 
        		 marker.id + "'>" + marker.name + " " + "(" + tt("click to select device") + ")" + "<input name='ReservationForm[way_dev][]' type='text' class='device-id' hidden></input></li>");
		
		$(".opener").click(function() {
			var content = this;
	        $("#waypoint-dialog").dialog({
	        	autoOpen: false,
	            modal: true,
	            resizable: false,
	            width: "auto",
	            open: function(event, ui) {
	            	prepareDialogDeviceSelect(markers, content);
	            },
	            buttons: [{
	            	text: tt('Save'),
	                click: function() {
	                	setWayPointDevice(content);
	            		$("#waypoint-dialog").dialog( "close" );
	                }},{
	            	text: tt('Cancel'),
	                click: function() {
	                	$("#waypoint-dialog").dialog( "close" );
	                }
	            }],
	        });
	        $("#waypoint-dialog").dialog("open");
	    });
		
	} else {
		var network = getNetworkMarker(markers, marker.networkId);
		
		$("#waypoints_order").append("<li class='ui-state-default' id='way" + 
				 network.id + "-" + marker.id + "'>" + network.name + " (" + marker.name + ")<input name='ReservationForm[way_dev][]' value='" + 
				 marker.id + "' type='text' class='device-id' hidden></input></li>");
	}
	
	drawCircuit();
}

function hideReservationTabs() {
	$("#reservation-tab").fadeOut();
	$(".reservation-point").fadeOut();
}

function deleteWayPoint(marker) {
	if (marker.type == "net") {
		$("#way" + marker.id).remove();
	} else {
		$("#way" + marker.networkId + "-" + marker.id).remove();
	}
	
	for (var i = 0; i < wayPoints.length; i++) {
		if (wayPoints[i] == marker) {
			wayPoints.splice(i, 1);
			break;
		}
	}
	
	if (wayPoints.length < 1) {
		$("#reservation-waypoints").hide();
	}
	
	marker.setMap(null);
	markerCluster.addMarker(marker);
	marker.circuitMode = "none";
	
	drawCircuit();
}

function deleteWayPoints() {
	$("#waypoints_order").empty();
	
	var marker = wayPoints.pop();
	while(marker) {
		marker.setMap(null);
		markerCluster.addMarker(marker);
		marker.circuitMode = "none";
		
		marker = wayPoints.pop();
	}
	
	if (wayPoints.length < 1) {
		$("#reservation-waypoints").hide();
	}
	
	drawCircuit();
}

///////// SELECTS DINAMICOS ////////////

function fillDomainSelect(endPointType) {
	clearSelect(endPointType, "domain");
	$("#"+ endPointType + "-domain").append('<option value="null">' + tt('loading') + '</option>');
	$.ajax({
		url: baseUrl+'/topology/domain/get-all',
		data: {
			cols: JSON.stringify(['id','name']),
		},
		dataType: 'json',
		success: function(domains){
			clearSelect(endPointType, "domain");
			$("#"+ endPointType + "-domain").append('<option value="null">' + tt('select') + '</option>');
			for (var i = 0; i < domains.length; i++) {
				$("#"+ endPointType + "-domain").append('<option value="' + domains[i].id + '">' + domains[i].name + '</option>');
			}
		},
	});
}

function fillNetworkSelect(endPointType, domainId, networkId) {
	clearSelect(endPointType, "network");
	if (domainId != "null" && domainId != null) {
		$("#"+ endPointType + "-network").append('<option value="null">' + tt('loading') + '</option>');
		$.ajax({
			url: baseUrl+'/topology/network/get-by-domain',
			data: {
				id: domainId,
			},
			dataType: 'json',
			success: function(response){
				clearSelect(endPointType, "network");
				$("#"+ endPointType + "-network").append('<option value="null">' + tt('select') + '</option>');
				enableSelect(endPointType, "network");
				for (var i = 0; i < response.length; i++) {
					$("#"+ endPointType + "-network").append('<option value="' + response[i].id + '">' + response[i].name + '</option>');
			    }
				if (networkId != null) {
					$("#"+ endPointType + "-network").val(networkId);
				}
			}
		});
	} else {
		disableSelect(endPointType, "network");
	}
}

function fillDeviceSelect(endPointType, networkId, deviceId) {
	clearSelect(endPointType, "device");
	if (networkId != "null" && networkId != null && networkId != "") {
		$("#"+ endPointType + "-device").append('<option value="null">' + tt('loading') + '</option>');
		$.ajax({
			url: baseUrl+'/topology/device/get-by-network',
			dataType: 'json',
			data: {
				id: networkId,
			},
			success: function(response){
				clearSelect(endPointType, "device");
				$("#"+ endPointType + "-device").append('<option value="null">' + tt('select') + '</option>');
				enableSelect(endPointType, "device");
				for (var i = 0; i < response.length; i++) {
					$("#"+ endPointType + "-device").append('<option value="' + response[i].id + '">' + response[i].name + '</option>');
			    }
				if (deviceId != null && deviceId != "") {
					$("#"+ endPointType + "-device").val(deviceId);
				}
			}
		});
	} else {
		disableSelect(endPointType, "device");
	}
}

function fillPortSelect(endPointType, deviceId) {
	clearSelect(endPointType, "port");
	if (deviceId != "null" && deviceId != null) {
		$("#"+ endPointType + "-port").append('<option value="null">' + tt('loading') + '</option>');
		$.ajax({
			url: baseUrl+'/topology/urn/get-by-device',
			dataType: 'json',
			data: {
				id: deviceId,
				cols: JSON.stringify(['id','port']),
			},
			success: function(response){
				clearSelect(endPointType, "port");
				$("#"+ endPointType + "-port").append('<option value="null">' + tt('select') + '</option>');
				enableSelect(endPointType, "port");
				for (var i = 0; i < response.length; i++) {
					var port = response[i].port;
					if (response[i].port == "") {
						port = tt("no name");
					}
					$("#"+ endPointType + "-port").append('<option value="' + response[i].id + '">' + port + '</option>');
			    }
			}
		});
	} else {
		disableSelect(endPointType, "port");
	} 
}

function fillVlanSelect(endPointType, portId) {
	clearSelect(endPointType, "vlan");
	if (portId != "null" && portId != null) {
		$("#"+ endPointType + "-vlan").append('<option value="null">' + tt('loading') + '</option>');
		$.ajax({
			url: baseUrl+'/topology/urn/get-vlan-ranges',
			dataType: 'json',
			data: {
				urnId: portId,
			},
			success: function(response){
				clearSelect(endPointType, "vlan");
				$("#"+ endPointType + "-vlan").append('<option value="' + response[0].value + '">' + tt("any") + '</option>');
				
				for (var i = 0; i < response.length; i++) {
					var interval = response[i].value.split("-");
					var low = parseInt(interval[0]);
					var high = low;
					if (interval.length > 1) {
						high = parseInt(interval[1]);
					}
					
					for (var j = low; j < high+1; j++) {
						$("#"+ endPointType + "-vlan").append('<option value="' + j + '">' + j + '</option>');
					}
			    }
				enableSelect(endPointType, "vlan");
			}
		});
	} else {
		disableSelect(endPointType, "vlan");
	}
}

function setNetworkSelected(endPointType, marker) {
	if (marker) {
		$("#"+ endPointType + "-domain").val(marker.domainId);
		fillNetworkSelect(endPointType, marker.domainId, marker.id);
		fillDeviceSelect(endPointType, marker.id);
	} else {
		fillNetworkSelect(endPointType, null, null);
		fillDeviceSelect(endPointType, null, null);
	}
	
	fillPortSelect(endPointType, null);
	fillVlanSelect(endPointType, null);
}

function setDeviceSelected(endPointType, marker) {
	if (marker) {
		$("#"+ endPointType + "-domain").val(marker.domainId);
		fillNetworkSelect(endPointType, marker.domainId, marker.networkId);
		fillDeviceSelect(endPointType, marker.networkId, marker.id);
		fillPortSelect(endPointType, marker.id);
	} else {
		$("#"+ endPointType + "-domain").val("null");
		fillNetworkSelect(endPointType, null, null);
		fillDeviceSelect(endPointType, null, null);
		fillPortSelect(endPointType, null);
	}
	
	fillVlanSelect(endPointType, null);
}

///////////// DESENHAR CIRCUITO NO MAPA ///////////////

function drawCircuit() {
	var path = [];
	
	if (circuit != null) 
		circuit.setMap(null);
	
	if (sourceMarker) {
		path.push(sourceMarker.position);
	} 
	
	for (i = 0; i < wayPoints.length; i++) {
		path.push(wayPoints[i].position);
	}
	
	if (destinMarker) {
		path.push(destinMarker.position);
	}
	
	if (path.length > 1) {
		circuit = new google.maps.Polyline({
	        path: path,
	        strokeColor: "#0000FF",
	        strokeOpacity: 0.5,
	        strokeWeight: 5,
	        geodesic: false,
	    });
	    
	    try {
	    	circuit.setMap(map);
	    	setMapBounds(path);
	    	enableBandwidthSpinner();
	    } catch (e) {
	    }
	} else {
		disableBandwidthSpinner();
	}
}

function setEndPoint(endPointType, marker) {
	removeEndPoint(endPointType);
	
	if (endPointType == "src") {
		if (marker) {
			sourceMarker = marker;
		} 
		
	} else if (marker) {
			destinMarker = marker;
	}
	
	if (marker && (sourceMarker == destinMarker)) {
		marker.circuitMode = 'intra';
	} else if (marker) {
		marker.circuitMode = endPointType;
		markerCluster.removeMarker(marker);
		marker.setMap(map);
	}
	
	if (marker && marker.type == "net") {
		setNetworkSelected(endPointType, marker);
	} else {
		setDeviceSelected(endPointType, marker);
	}
	
	drawCircuit();
}

function removeEndPoint(endPointType) {
	if (endPointType == "src") {
		if (sourceMarker) {
			if (sourceMarker.circuitMode == "intra") {
				sourceMarker.circuitMode = "dst";
			} else {
				sourceMarker.setMap(null);
				markerCluster.addMarker(sourceMarker);
				sourceMarker.circuitMode = "none";
			}
			sourceMarker = null;
		} 
		
	} else if (destinMarker) {
		if (destinMarker.circuitMode == "intra") {
			destinMarker.circuitMode = "src";
		} else {
			destinMarker.setMap(null);
			markerCluster.addMarker(destinMarker);
			destinMarker.circuitMode = "none";
		}
		destinMarker = null;
	}
	
	setNetworkSelected(endPointType, null);
	
	drawCircuit();
}

//////////// INICIALIZA MAPA /////////////////

function initialize() {
	var myLatlng = new google.maps.LatLng(0,0);
	var mapOptions = {
			zoom: 3,
			minZoom: 3,
			maxZoom: 15,
			center: myLatlng,
			streetViewControl: false,
			panControl: false,
			zoomControl: false,
			mapTypeControl: false,
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	
	var markerClustererOptions = {
			gridSize: 10, 
			maxZoom: 10,
			ignoreHidden: true
		};
	
	markerCluster = new MarkerClusterer(
			map, 
			null, 
			markerClustererOptions
	);
	
	google.maps.event.addListener(map, 'click', function() {
		closeWindows();
	});
	
	var markers = [];
	
	initSelect("src", markers);
	initSelect("dst", markers);
	
	$.ajax({
		url: baseUrl+'/topology/network/get-all',
		dataType: 'json',
		success: function(response){
			count = shift;

			for(index = 0; index < response.length; index++){
				var network = response[index];
				addNetworkMarker(markers, network);
			}
			
			markerCluster.addMarkers(markers);
			
			setMarkerType(markers, "dev");
			$("#marker-type-device").attr("checked", "checked");
		},
		error: function (request, status, error) {
		    alert(request + error + status);
		 
		}
	});
	
	$('#marker-type-network').on('change', function() {
		setMarkerType(markers, "net");
	});
	
	$('#marker-type-device').on('change', function() {
		setMarkerType(markers, "dev");
	});
	
	enableWayPointsSortable(markers);
	initEndPointButtons("src", markers);
    initEndPointButtons('dst', markers);
}

//////////// ADICIONA MARCADORES NO MAPA /////////////////

function addNetworkMarker(markers, network) {
	var contentString = tt('Network') + ': <b>'+network.name+'</b><br>';
	
	if (network.latitude != null && network.longitude != null) {
		var myLatlng = getValidMarkerPosition(markers, "net", new google.maps.LatLng(network.latitude, network.longitude));
		
	} else {
		var myLatlng = new google.maps.LatLng(0, count);
		count = count + shift;
	}
	
	var marker = new StyledMarker({
		styleIcon: new StyledIcon(
			StyledIconTypes.MARKER,
				{
					color: generateColor(network.domain_id),
				}
		),
		position: myLatlng,
		type: "net",
		circuitMode: "none",
		id: network.id,
		name: network.name,
		domainId: network.domain_id,
		deviceCounter: shift,
		info: contentString,
	});
	
	var length = markers.push(marker);
	
	addMarkerListeners(markers, length - 1);
}

function addDeviceMarker(markers, device) {
	var network = getNetworkMarker(markers, device.network_id);
	var contentString = tt('Network') + ': <b>'+network.name+'</b><br>' + tt('Device') + ': <b>' + device.name + '</b><br>';
	
	if (device.latitude != null && device.longitude != null) {
		var myLatlng = new google.maps.LatLng(device.latitude,device.longitude);
	} else {
		var myLatlng = new google.maps.LatLng(network.getPosition().lat(), network.getPosition().lng() + network.deviceCounter);
		network.deviceCounter += shift;
	}
	
	var marker = new google.maps.Marker({
		icon: {
		    path: 'M 15 15 L 35 15 L 25 35 z',
		    anchor: new google.maps.Point(25, 35),
		    fillColor: '#' + generateColor(network.domainId),
		    fillOpacity: 1,
		    strokeColor: 'black',
		},
		position: myLatlng,
		type: "dev",
		circuitMode: "none",
		id: device.id,
		name: device.name,
		domainId: network.domainId,
		networkId: network.id,
		info: contentString,
	});
	
	var length = markers.push(marker);
	
	addMarkerListeners(markers, length - 1);
}

function getValidMarkerPosition(markers, markerType, position) {
	for(i = 0; i < markers.length; i++){
		if (markers[i].type == markerType && (markers[i].position.lat().toString().substring(0,6) == position.lat().toString().substring(0,6)) && 
				(markers[i].position.lng().toString().substring(0,6) == position.lng().toString().substring(0,6))) {
			return getValidMarkerPosition(markers, markerType, new google.maps.LatLng(position.lat(), position.lng() + shift));
		}
	}
	
	return position;
}

//////////// LISTENERS DOS MARCADORES /////////////

function addMarkerListeners(markers, index) {
	google.maps.event.addListener(markers[index], 'mouseover', function(key) {
		return function(){
			closeWindows();
			
			var contentWindow;
			
			switch(markers[key].type) {
				case "net":
					switch(markers[key].circuitMode) {
						case "src":
						case "dst":
								contentWindow = MARKER_OPTIONS_END_POINT;
								break;
						case "way":
								contentWindow = MARKER_OPTIONS_WAY_POINT;
								break;
						case "intra":
								contentWindow = MARKER_OPTIONS_INTRA;
								break;
						case "none":
						default: 
								contentWindow = MARKER_OPTIONS_NET;
					}
					break;
				case "dev":
				default: 
					switch(markers[key].circuitMode) {
						case "src":
						case "dst":
								contentWindow = MARKER_OPTIONS_END_POINT;
								break;
						case "way":
								contentWindow = MARKER_OPTIONS_WAY_POINT;
								break;
						case "intra":
								contentWindow = MARKER_OPTIONS_INTRA;
								break;
						case "none":
						default: 
								contentWindow = MARKER_OPTIONS_DEV;
					}
			}
			
			
			markerWindow = new google.maps.InfoWindow({
				content: '<div class = "MarkerPopUp" style="width: 230px;"><div class = "MarkerContext">' +
					markers[key].info + "<br>" + contentWindow + '</div></div>'
				});
            openedWindows.push(markerWindow);
			
			google.maps.event.addListener(markerWindow, 'domready', function(marker){
			    return function() { 
		    		$('#set-as-source').on('click', function() {
		    			closeWindows();
		    			
		    			setEndPoint("src", marker);
		    		});
		    		
		    		$('#set-as-waypoint').on('click', function() {
		    			closeWindows();
		    			
		    			addWayPoint(markers, marker);
		    		});
		    		
		    		$('#set-as-dest').on('click', function() {
		    			closeWindows();
		    			
		    			setEndPoint('dst', marker);
		    		});
		    		
		    		$('#set-as-intra').on('click', function() {
		    			closeWindows();
		    			
		    			deleteWayPoints();		    			
		    			
		    			setEndPoint("src", marker);
		    			setEndPoint("dst", marker);
		    		});
		    		
		    		$('#remove-waypoint').on('click', function() {
		    			closeWindows();
		    			
		    			deleteWayPoint(marker);
		    		});
		    		
		    		$('#remove-endpoint').on('click', function() {
		    			closeWindows();
		    			
		    			removeEndPoint(marker.circuitMode);
		    		});
		    		
		    		$('#remove-intra').on('click', function() {
		    			closeWindows();
		    			
		    			removeEndPoint("src");
		    		});
			    }
			}(markers[key]));
			
			markerWindow.open(map, markers[key]);
		}
	}(index));
}

/////////////// ALTERAR MARCADORES VISIVEIS /////////////////////

function setMarkerType(markers, markerType) {
	closeWindows();
	currentMarkerType = markerType;
	removeEndPoint("src");
	fillDomainSelect("src");
	removeEndPoint("dst");
	fillDomainSelect("dst");
	setMarkersVisible(markers, markerType);
	if (markerType == "dev") {
		if (!devicesLoaded) {
			loadDeviceMarkers(markers);
			devicesLoaded = true;
		} 
	}
	deleteWayPoints();
}

function setMarkersVisible(markers, markerType) {
	for(i = 0; i < markers.length; i++){ 
		switch (markerType) {
		case "net" : 
			if (markers[i].type == "net") {
				markers[i].setVisible(true);
			} else {
				markers[i].setVisible(false);
			}
			break;
		case "dev" :
			if (markers[i].type == "dev") {
				markers[i].setVisible(true);
			} else {
				markers[i].setVisible(false);
			}
			break;
		default : 
			console.log("error?" + markerType);
		}
	}
	markerCluster.repaint();
}

////////////// ADICIONA MARCADORES DE DISPOSITIVOS ////////////////

function loadDeviceMarkers(markers) {
	$.ajax({
		url: baseUrl+'/topology/device/get-all',
		dataType: 'json',
		success: function(response){
			count = 0;
			
			var deviceMarkers = [];
			
			for(index = 0; index < response.length; index++){
				var device = response[index];
				addDeviceMarker(markers, device);
			}
			
			markerCluster.clearMarkers();
			markerCluster.addMarkers(markers);
		},
		error: function (request, status, error) {
		    alert(request + error + status);
		}
	});	
}

////////// FECHA JANELA DO MARCADOR ///////////////

function closeWindows() {
    var size = openedWindows.length;
	for (var i = 0; i < size; i++) {
		openedWindows[i].close();
	}
}

////////// INICIALIZA SELECT LISTENERS //////////////////

function initSelect(endPointType, markers) {
	fillDomainSelect(endPointType);
	
	$('#' + endPointType + '-domain').on('change', function() {
		removeEndPoint(endPointType);
		fillNetworkSelect(endPointType, this.value);
		fillDeviceSelect(endPointType);
		fillPortSelect(endPointType);
		fillVlanSelect(endPointType);
	});
	
	$('#' + endPointType + '-network').on('change', function() {
		if (currentMarkerType == "net") {
			var marker = getNetworkMarker(markers, this.value);
			
			setEndPoint(endPointType, marker);
		}
		
		fillDeviceSelect(endPointType, this.value);
		fillPortSelect(endPointType);
		fillVlanSelect(endPointType);
	});
	
	$('#' + endPointType + '-device').on('change', function() {
		if (currentMarkerType == "dev") {
			var marker = getDeviceMarker(markers, this.value);

			setEndPoint(endPointType, marker);
		}
		
		fillPortSelect(endPointType, this.value);
		fillVlanSelect(endPointType);
	});
	
	$('#' + endPointType + '-port').on('change', function() {
		if (this.value != "null") {
			$('#' + endPointType + "-copy-urn").removeClass("ui-state-disabled");
		}
		fillVlanSelect(endPointType, this.value);
	});
}

function clearSelect(endPointType, object) {
	$('#' + endPointType + '-' + object).children().remove();
}

function disableSelect(endPointType, object) {
	if (object == "port") {
		$('#' + endPointType + "-copy-urn").addClass("ui-state-disabled");
	}
	$('#' + endPointType + '-' + object).prop('disabled', true);
}

function enableSelect(endPointType, object) {
	if ($('#' + endPointType + '-' + object).val() != null && $('#' + endPointType + '-' + object) != "null") {
		$('#' + endPointType + '-' + object).prop('disabled', false);
	}
}

function getNetworkMarker(markers, id) {
	for(i = 0; i < markers.length; i++){
		if (markers[i].type == "net" && markers[i].id == id) {
			return markers[i];
		}
	}
	
	return null;
}

function getDeviceMarker(markers, id) {
	for(i = 0; i < markers.length; i++){
		if (markers[i].type == "dev" && markers[i].id == id) {
			return markers[i];
		}
	}
	
	return null;
}

////////// DEFINE ZOOM E LIMITES DO MAPA A PARTIR DE UM CAMINHO ////////

function setMapBounds(path) {
    if (path.length < 2) return;
    polylineBounds = new google.maps.LatLngBounds();
    for (i = 0; i < path.length; i++) {
    	polylineBounds.extend(path[i]);
    }
    map.fitBounds(polylineBounds);
    map.setCenter(polylineBounds.getCenter());
}

////////// GERA COR A PARTIR DE ID /////////////////////////////////////

function generateColor(domainId) {
    var firstColor = "3a5879";
    if (domainId == 0) {
        return firstColor;
    } else {
        var color = parseInt(firstColor, 16);
        color += (domainId * parseInt("d19510", 16));
        if ((color == "eee") && (color == "eeeeee")) {
            color = "dddddd";
            color = color.toString(16);
        } else if (color > 0xFFFFFF) {
            color = color.toString(16);
            color = color.substring(1, color.length);
            if(color.length > 6) {
                var str = color.split("");
                color = "";
                for (var i=1; i<str.length; i++) {
                    color = color + str[i];
                }
            }
        } else {
            color = color.toString(16);
        }
        return color;
    }
}

google.maps.event.addDomListener(window, 'load', initialize);