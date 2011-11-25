
var errorFunc = function(jqXHR) {
    switch (jqXHR.status) {
        case 401:
            top.location.href = baseUrl;
            break;
        case 402:
            top.location.href = baseUrl;
            break;
        case 404:
            setFlash("Page not found", 'error');
            break;
        case 405:
            //change lang
            top.location.href = baseUrl+'init/gui';
            break;
        case 406:
            //force refresh
            location.href = baseUrl+'init/gui';
            break;
        default:
            setFlash("Unexpected error "+jqXHR.status, 'error');
    }
};

$(document).ready(function() {
    
    jQuery.fn.uify = function(){
        
        $(this).find('button,input[type=submit],input[type=button]').button();
        //$('input[type=button].add').button({icon: 'plusthick'});
        //$('input[type=button].add').button({ icons: {primary:'ui-icon-plusthick',secondary:'ui-icon-plusthick'} });
        $(this).find('[disabled=disabled]').addClass('ui-state-disabled');
        $(this).find('input[type!=submit],textarea,select').addClass('ui-widget ui-widget-content');
        $(this).find('table').addClass('ui-widget ui-corner-all');
        $(this).find('fieldset').addClass('ui-widget ui-corner-all');
        $(this).find('table thead').addClass('ui-widget-header');
        $(this).find('table tbody').addClass('ui-widget-content');

    /*        $(this).find('div.menu').addClass('ui-widget');
        $(this).find('div.topItem').addClass('ui-widget-header');
        $(this).find('div.subItem').addClass('ui-widget-content');*/
        
    };
    
    $('body').uify();

    $.feedbackTab.init();
    /* $("#info_box").load("<?php echo $this->url(array("app" => "init", "controller" => "info_box")); ?>", function() {
                    
                   
                });*/
    setInterval("updateSystemTime()", 60000);//<?php // chamada para atualizar a hora?>
    //$("#menu").load("<?php echo $this->url(array("app" => "init", "controller" => "menu"));  ?>");
                
    $('a[href!=""][href!="#"]').pjax('#main', {
        error: errorFunc, 
        timeout: 5000
    });
    $('#main')
    .bind('start.pjax', function() {
        clearFlash();
        $('#main').empty();
        $('#load_img').show();

        clearInterval(js_function_interval);
    })
    .bind('end.pjax',   function(xhr) {
        $('#main').hide();
        clearInterval(js_function_interval);
                        
        $('#flash_box').html($('.flash_box').html());
        $('.flash_box').remove();
                        
        $.each($(".scripts i"), function() {
            $.getScript($(this).html());
        });
        $('.scripts').remove();
        $('#load_img').hide();
        //$('#main').html($('.content').html());
        $('#main').uify();
        $('#main').show();
        window.scroll(0, 0);

    });

    $("body").delegate("form","submit",function() {
        if (!js_submit_form) {
            js_submit_form = true;
            return false;
        }

        var content_show = $(this).attr("action");
        var param = $('form').serialize();

        if (content_show && param)
            $.pjax({
                type: "POST",
                url: content_show,
                data: param,
                error: errorFunc,
                container: '#main',
                timeout: 7000
            });
        return false;
    });
// analisar a real necessidade disso
//setTimeout(refresh, 10*60*1000); // carrega a página a cada 10 min., para não sobrecarregar scripts

}); //do ready

function redir(url, data){
    $.pjax({
        type: "POST",
        url: url,
        data: data,
        error: errorFunc,
        container: '#main',
        timeout: 7000
    });
    return false;
}

function clearSelectBox(htmlId){
    $(htmlId).empty();
    $(htmlId).append('<option value="-1"></option>');
}

function fillSelectBox(htmlId, fillerArray, current_val) {
    clearSelectBox(htmlId);
    for (var i=0; i < fillerArray.length; i++) {
        if (fillerArray[i].id == current_val)
            $(htmlId).append('<option selected="true" value="' + fillerArray[i].id + '">' + fillerArray[i].name + '</option>');
        else
            $(htmlId).append('<option value="' + fillerArray[i].id + '">' + fillerArray[i].name + '</option>');
    }
}
            
function setFlash(message, status) {
    $('#flash_box').empty();
    if (!status)
        status = "info";
    $('#flash_box').append('<div class="' + status + ' ui-corner-all" style="padding: 0 .7em;"><p><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span><span class="ui-icon ui-icon-closethick close-button" onclick="clearFlash();"></span>'+ message +
        '</p>');
    window.scroll(0, 0);
    window.onscroll = $.windowScroll;
}

function clearFlash(){
    $('#flash_box').empty();
    window.onscroll = null;
}

function WPToggle(divId, imageId) {

    if ($(divId).css("display") == "none") {
        $(divId).slideDown();
        $(imageId).attr("src", baseUrl+"webroot/img/minus.gif" );
    }

    else {
        $(divId).slideUp();
        $(imageId).attr("src", baseUrl+"webroot/img/plus.gif");
    }

}
 

$.extend({
    redir : function(url, data){
        return redir(baseUrl+url, data);
    /*$.pjax({
            type: "POST",
            url: url,
            data: data,
            error: errorFunc,
            container: '#main',
            timeout: 5000
        });
        return false;*/
    },
    windowScroll: function () {
        var top = $(window).scrollTop();
        if (top >= 110) {
            $("#flash_box").addClass("fixed");
        } else {
            $("#flash_box").removeClass("fixed");
        }
    },
    formatFields: function(){
        var intInp = $('.integer-input[disabled!=true]'),
        curInp = $('.currency-input[disabled!=true]');
        if (intInp.length>0 || curInp.length>0){
            applySpinner = function(){
                intInp.numeric('.').spinner({});
                if (curInp.length>0)
                    if (window.Globalization)
                        curInp.numeric('.').spinner({
                            numberformat: 'n'
                        });
                    else
                        $.getScript(baseUrl+'webroot/js/jquery.global.js', function(){
                            window.Globalization = jQuery.global;
                            curInp.numeric('.').spinner({
                                numberformat: 'n'
                            });
                        });
                //Trigger change event in field when spinner changes
                $(".ui-spinner").bind("mouseup", function() {
                    intInp.numeric('.').trigger("change");
                //alert(intInp.numeric('.').val());
                }).bind("keyup", function() {
                    intInp.numeric('.').trigger("change");
                //alert(intInp.numeric('.').val());
                });
            };
            if (jQuery.isFunction(jQuery.fn.spinner))
                applySpinner();
            else
                $.getScript(baseUrl+'webroot/js/ui.spinner.js', applySpinner);
        }
    },
    feedbackTab : {
 
        speed:300,
        containerWidth:$('.feedback-panel').outerWidth(),
        containerHeight: $('.feedback-panel').height(),//$('.feedback-panel').outerHeight(),
        tabWidth:$('.feedback-link').outerWidth(),
	 
	 
        init:function(){
            //$('.feedback-panel').css('height',$.feedbackTab.containerHeight + 'px');
            $('.feedback-panel').css('top', '-' + $('.feedback-panel').outerHeight() + 'px');
	 
            $('a.feedback-link').click(function(event){
                if ($('.feedback-panel').hasClass('open')) {
                    $('.feedback-panel')
                    .animate({
                        top: '-' + $('.feedback-panel').outerHeight() + 'px'
                        }, $.feedbackTab.speed)
                    .removeClass('open');
                } else {
                    $('.feedback-panel')
                    .animate({
                        top: $('.feedback-link').outerHeight() + 'px'
                        },  $.feedbackTab.speed)
                    .addClass('open');
                }
                event.preventDefault();
            });
        }
    }
                
});
