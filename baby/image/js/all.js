$.fn.maps = function (_0x2091x1) {
	var options = { speed : 300 };
	$.extend (options, _0x2091x1);
	var is_open = 0;
	var is_768 = 0;
	$ (".venus-menu").find ("li").each (function () {
		if ($ (this).children("ul").length > 0) {
			$ (this).append("<span class='indicator'><i class='fa fa-angle-down'></i></span>");

		};
	});
	$ (".venus-menu").prepend("<li class='showhide'><span class='glyphicon glyphicon-menu-hamburger'></span></li>");

	$(document).ready(function(){howwidth();})

	$ (window).resize(function () {
		howwidth();
	});

	function howwidth() {
		if (window.innerWidth<= 900) {
			if(is_768==0){
				$ (".venus-menu").find("li, a, span").unbind();
				$ (".venus-menu").find("ul").hide(0);
				goto_s();
				if (is_open == 0) {
					//$ (".venus-menu > li:not(.showhide)").hide(0);
				};
				is_768=1;
			}
		} else {
			$ (".venus-menu").find("li, a, span").unbind();
			$ (".venus-menu").find("ul").hide(0);
			goto_l();
		};
		if(!$.support.leadingWhitespace){
			$ (".venus-menu").children("li").css("width",100/($ (".venus-menu").children("li").length-1)+"%");
		}
	};

	function goto_s() {
		$ (".venus-menu > li.showhide").show(0);
		$ (".venus-menu > li.showhide").bind("click", function () {
			if ($ (".venus-menu > li").is(":hidden")) {
				$ (".venus-menu > li").slideDown(300);
				is_open = 1;
			} else {
				$ (".venus-menu > li:not(.showhide)").slideUp(300);
				$ (".venus-menu > li.showhide").show(0);
				is_open = 0;
			};
		});

		$ (".venus-menu").find("ul").removeClass("zoom-out");
		$ (".venus-menu li:not(.showhide)").each(function () {
			if ($ (this).children("ul").length> 0) {
				$ (this).children("a").bind("click", function () {
					if ($ (this).siblings("ul").css("display") == "none") {
						$ (this).siblings("ul").slideDown(300).addClass("slide-left");
						is_open = 1;
					} else {
						$ (this).siblings("ul").slideUp(300).removeClass("slide-left");
					};
					return false;
				});
				$ (this).children(".indicator").bind("click", function () {
					if ($ (this).siblings("ul").css("display") == "none") {
						$ (this).siblings("ul").slideDown(300).addClass("slide-left");
						is_open = 1;
					} else {
						$ (this).siblings("ul").slideUp(300).removeClass("slide-left");
					};
				});
			};
		});
	};

	function goto_l() {
		$ (".venus-menu > li").show(0);
		$ (".venus-menu > li.showhide").hide(0);

		$ (".venus-menu").find("ul").removeClass("slide-left");
		$ (".venus-menu li").bind("mouseover", function () {
			$ (this).children("ul").stop(true, true).fadeIn(options.speed).addClass("zoom-out");
		}).bind("mouseleave", function () {
			$ (this).children("ul").stop(true, true).fadeOut(options.speed).removeClass("zoom-out");
		});
	};
};
//*********************************
$(function(){
	var tn=0;
	$(".searchdiv").hover(function(){
		if(!tn){
			tn=1;
			$(this).addClass("searchdiv2");
		}
	},function(){
			$(".searchdiv").removeClass("searchdiv2");
			tn=0;
	});
	$(".searcha").click(function(){
		$(".searchdivxs").slideToggle();
	});
	$("#my-menu").trigger("open");
	$("#my-menu").trigger("close");



	$(window).scroll(function(){
		if ($(this).scrollTop() > 100) {
			$('.scrollup').fadeIn();
		} else {
			$('.scrollup').fadeOut();
		}
	});
	$('.scrollup').click(function(){
		$("html, body").animate({ scrollTop: 0 }, 800);
		return false;
	});

	$().maps();
   //*********************************//
     if ($(window).width() > 1088) {
        var scrollTop = 0;
        $(window).scroll(function () {
            if ($(this).scrollTop() > 50) {
                $('.top').addClass('mintop');
                $('.smenu').addClass('col-lg-9');
				$('.logoie').addClass('col-lg-3');
				$('.scut-container').addClass('topicon');
            } else if ($(this).scrollTop() < 50) {
                $('.top').removeClass('mintop');
                $('.smenu').removeClass('col-lg-9');
				$('.logoie').removeClass('col-lg-3');
				$('.scut-container').removeClass('topicon');
            }
        });
    }
    //*********************************//

});
function createDiv()
{
    var btnShow = document.getElementById("btnshow");
    btnShow.disabled=true;

    var shadow = document.createElement("div");
    shadow.setAttribute("id","shadow");
    shadow.style.zIndex="9999";
	shadow.style.height=document.documentElement.scrollHeight+"px";
	$(shadow).css({'width':'100%','position':'fixed','left':'0','top':'0','background':'#000','filter':'Alpha(opacity=10)','-moz-opacity':'0.1','opacity':'0.1'});

    var box=document.createElement("div");
    box.setAttribute("id","box");
    box.style.zIndex="99999999";
    document.body.appendChild(shadow);
    document.body.appendChild(box);
    $(box).append('<img src="images/loading/loading.gif" style="width:32px;">');
    $(box).css({'text-align':'center','position':'fixed','left':'50%','top':'50%'});
}
function hideDiv()
{
    var box=document.getElementById("box");
    var shadow=document.getElementById("shadow");
    var btnShow=document.getElementById("btnShow");

    document.body.removeChild(box);
    document.body.removeChild(shadow);
	//btnShow.disabled=false;

}
function getprice(pid,nowprice){
   $.post('getprice.html',
   {
   	 p2:pid,
   	 p3:nowprice,
   },
   function(data,status){
     if(status=="success"){
        $('.product3').html(data);
     }else{
     	alert('error:NET-ERROR');
     }
   });
}
function toThousands(num) {
   return (num || 0).toString().replace(/(\d)(?=(?:\d{3})+$)/g, '$1,');
}