$(document).ready(function() {

var $shades = $('#shades');
var $definition = $shades.find('.color-rules');

$('#info a').click(function(e) {
  e.preventDefault();
  $(this).tab('show');
});

$('#info a:first').tab('show');

$('#bootstrap-version').val(SOB.bootstrap);
$('#bootstrap-version').change(function() {
  window.location.href = window.location.href.replace(window.location.search, '') + '?' + $(this).val();
});

$('.shade-color input[type=color]').bind('change', function() {
  $('.update-hint').show();
});

function bindShades() {
  $('input[type=color]').bind('change', function() {
    var $input = $(this);
    $input.attr('value', $input.val().toUpperCase());
  });

  $definition.find('input[type=range]').bind('change', function() {
    var $input = $(this);
    $input.attr('value', $input.val().toUpperCase());

    var brandColorHex = $('input#brand').val();
    var brandColor = new less.tree.Color(brandColorHex.replace('#', ''));
    calculateColorInRule($input.parents('tr'), brandColor);
  });
}



function getLessVarsFromInput($input, $valInput, data) {

  var varString = $input.attr('name');

  var vars = [];
  if(varString.indexOf(',') !== -1) {
    vars = varString.split(',');
  } else {
    vars = [varString];
  }
  var data = data || {};
  vars.forEach(function(lessVar) {
    data[lessVar] = $valInput.val();
  });

  return data;
}

function modifyAll() {
  var data = {};
  $shades.find('#shades-grayscale tbody tr').each(function() {
    var $input = $(this).find('input[type=color]:eq(1)');
    getLessVarsFromInput($input, $input, data);
  });

  if($('input#apply-colors:checked').size() == 0) {
    $shades.find('#shades-colors tbody tr').each(function() {
      var $input = $(this).find('input[type=color]:eq(1)');
      var $valInput = $(this).find('input[type=color]:eq(0)');
      getLessVarsFromInput($input, $valInput, data);
    });
  } else {
    $shades.find('#shades-colors tbody tr').each(function() {
      var $input = $(this).find('input[type=color]:eq(1)');
      getLessVarsFromInput($input, $input, data);
    });
  }

  less.modifyVars(data);
}



function setInitialAdjustment() {

  $definition.find('tbody tr').each(function() {
    var $rule = $(this);
    var hex = $rule.find('input[type=color]:first').val();
    var color = new less.tree.Color(hex.replace('#', ''));
    

    var a = Math.abs(Math.abs(color.toHSL().l - 0.5) - 0.5);
    $rule.find('input[type=range]:first').val(a);
  });
}
//setInitialAdjustment();

function calculateColorInRule($rule, brandColor) {
  
  var effect = $rule.find('input[type=range]:first').val();

  var hex = $rule.find('input[type=color]:first').val();
  var color = new less.tree.Color(hex.replace('#', ''));

  var h, s, l;
  h = color.toHSL().h;
  if(color.toHSL().h == 0 || color.toHSL().s <= 0.1) {
    // grayscale: hue + some saturation
    h = brandColor.toHSL().h;
    s = brandColor.toHSL().s * effect;
    l = color.toHSL().l;
  } else {
    // maniuplate hue
    h = color.toHSL().h - (color.toHSL().h - brandColor.toHSL().h) * effect;
    // keep saturation
    s = color.toHSL().s;
    l = color.toHSL().l;
  }

  var effectedcolor = less.tree.functions.hsl(h, s, l);
  var cssVal = effectedcolor.toCSS();
  $rule.find('input[type=color]:eq(1)').val(cssVal).attr('value', cssVal);
  
}

function addEffect() {
  var brandColorHex = $('input#brand').val();
  var brandColor = new less.tree.Color(brandColorHex.replace('#', ''));
  $definition.find('tbody tr').each(function() {
    calculateColorInRule($(this), brandColor);
  });
  $('.update-hint').hide();
  modifyAll();
}

$('.apply').click(function(e) {
  e.preventDefault();
  applyCurve();
  addEffect();
  
})

function applyCurve() {
  $definition.find('tbody tr').each(function() {
    var $rule = $(this);
    var hex = $rule.find('input[type=color]:first').val();
    var color = new less.tree.Color(hex.replace('#', ''));
    var a = Curve.GetY(color.toHSL().l);
    $rule.find('input[type=range]:first').val(a).attr('value', Math.round(a * 100) / 100);
  });
}

$('.apply-curve').click(function(e) {
  e.preventDefault();
  applyCurve();
})

function onCurveChange() {
  $('.update-hint').show();
}

var Curve = window.Curve = new ColorCurve('shades-curve', onCurveChange);


window.exportForSass = function()  {
  var s = '';
  $definition.find('tbody tr').each(function() {
    var $rule = $(this);
    var names = $rule.find('td:first').html().split('<br>');
    var hex = $rule.find('input[type=color]:last').val();
    $.each(names, function(i, name) {
      s += name.replace('@', '$').replace(/^\s+|\s+$/g, '') + ': ' + hex
      s += "\n";
    })
    s += "\n\n";
  });
  console.log(s);
}

$.get(SOB.bootstrap + '/less/variables.less')
 .done(function(data) {
    
    var colorVars = [];
    new(less.Parser)(less.env).parse(data, function (e, root) {
      window.root = root;
      root.rules.forEach(function(rule) {
        if(!(rule instanceof less.tree.Rule)) {
          return;
        }
        if(!(rule.value instanceof less.tree.Value)) {
          return;
        }
        if(rule.value.value[0].value[0] instanceof less.tree.Color) {
          colorVars.push(
            [rule.name, rule.value.value[0].value[0]]
          );
        }
      });
    });
    

    colorVars = _.sortBy(colorVars, function(colorVar) {
      return colorVar[1].toHSL().l;
    });

    var byColors = {};
    _.each(colorVars, function(colorVar) {
      var css = colorVar[1].toCSS();
      if(!(css in byColors)) {
        byColors[css] = {
          color: colorVar[1],
          vars: []
        };
      }
      byColors[css].vars.push(colorVar[0]);
    });
    window.bc = byColors;

    var grayscaled = _.filter(byColors, function(c) {
      return (c.color.toHSL().s < 0.1)
    });
    var colored = _.filter(byColors, function(c) {
      return !(c.color.toHSL().s < 0.1)
    });
    colored = colored.reverse();
    colored = _.sortBy(colored, function(color) {
      return color.color.toHSL().h * color.color.toHSL().s;
    });

    var tmpl = _.template($('#xx').html());

    var $tbody = $('#shades-grayscale tbody');
    _.each(grayscaled, function(color) {
      var data = {};
      data.hex = color.color.toCSS();
      data.names = color.vars.join('<br>');
      data.vars = color.vars.join(',');
      $tbody.append(tmpl(data));
    });

    var $tbody = $('#shades-colors tbody');
    _.each(colored, function(color) {
      var data = {};
      data.hex = color.color.toCSS();
      data.names = color.vars.join('<br>');
      data.vars = color.vars.join(',');
      $tbody.append(tmpl(data));
    });

    window.cv = colorVars;

    bindShades();
    applyCurve();
 });



});