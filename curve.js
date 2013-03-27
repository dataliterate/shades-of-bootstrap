/**
* origimal code here: https://github.com/vaguilera/ColorCurve
* 
* combined with monotoniccubicspline
*
*/
function ColorCurve(canvas, callback)
{
  this.points     = [];
  this.currentpoint   = -1;
  this.c        = document.getElementById(canvas);
  this.ctx      = this.c.getContext('2d');
  this.height     = this.c.height;
  this.width      = this.c.width;
  this.redraw     = 0;
  this.values     = [];
  this.rgb      = [];
  this.onchange   = callback;

  if (this.height != this.width) {
    console.log("ERROR: Canvas must have same width and height.");
    //return;
  }

  this.points.push({x: 0, y: 0.5});
  this.points.push({x: 0.5, y: 0.15});
  //this.points.push({x: 0.5, y: 0.5});
  //this.points.push({x: 0.850, y: 0.150});
  this.points.push({x: 1.0, y: 0.5});

  var me = this; // Copying IQ's trick from Graphtoy -- http://www.iquilezles.org
  this.c.onmousedown = function(ev) { me.MouseDown(ev); }
  this.c.onmouseup = function(ev) { me.MouseUp(ev);  me.Draw(); }
  this.c.onmouseout = function(ev) { me.MouseUp(ev);  me.Draw();}
  this.c.onmousemove = function(ev) { 
    me.MouseMove(ev);
    if (me.redraw == 1) {
      me.Draw();
      me.redraw = 0;
    }
   }

  this.Draw();
  this.UpdateValues();
}

// Update the RGB array to fit the new curve values. Transform curve points to 0..255 values
ColorCurve.prototype.UpdateValues = function()
{
  this.rgb.splice(0, this.rgb.length);  
  for(var i=0;i<256;i++) this.rgb.push(Math.round(this.GetY(i/255.0)*255));

  this.onchange();

}

// Compare 2 points
ColorCurve.prototype.IsEqual = function(p1,p2)
{
  if (p1.x == p2.x && p1.y == p2.y) return true;
  else return false;
}

// Draw the curve
ColorCurve.prototype.Draw = function() 
{
  this.values.splice(0, this.values.length);
  this.ctx.clearRect(0, 0, this.width, this.height);
  this.DrawGrid();
  
  /*
  for(i=0;i<this.points.length-1;i++)
  {
    if (i<1) { 
      p1 = this.points[0];
    } else { 
      p1 = this.points[i-1];
    }  
    if (i+2 > this.points.length-1) {
      p4 = this.points[i+1];
    } else { 
      p4 = this.points[i+2];
    } 
    this.Quadratic(p1,this.points[i],this.points[i+1],p4);
  }
  */
  var xs = [];
  var ys = [];
  this.points.forEach(function(point) {
    xs.push(point.x);
    ys.push(point.y);
  });

  this.curve = new MonotonicCubicSpline(xs, ys);
  console.log(this.curve);
  this.drawCurve();
  this.DrawPoints();
  
}

// The background grid
ColorCurve.prototype.DrawGrid = function() 
{
  

  this.ctx.beginPath();
  this.ctx.lineWidth = 1;
  this.ctx.strokeStyle = '#aaaaaa';
  
  var space = this.height/4.0; 
  for(i=0;i<this.height-space;i+=space)
  {
    this.ctx.moveTo(0, i+space);
    this.ctx.lineTo(this.width, i+space);
  }
  var space = this.width/4.0;
  for(i=0;i<this.width-space;i+=space)
  {
    this.ctx.moveTo(i+space, 0);
    this.ctx.lineTo(i+space, this.height);
  }
  this.ctx.stroke();
}

ColorCurve.prototype.drawCurve = function() {


    var started = false;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    var pxStep = 2;
    var xfactor = 1/this.width;
    var yfactor = 1/this.height;

    for (var px = 0; px <= this.width; px += pxStep) {
      var splineX = px * xfactor;
      var py = this.curve.interpolate(splineX) / yfactor;
      if (typeof(py) == 'number') {
        if (started) this.ctx.lineTo(px, this.height - py);
        else {
          this.ctx.moveTo(px, this.height - py);
          started = true;
        }
      }
    }
    this.ctx.stroke();
    this.ctx.closePath();

}

// Draw the control points
ColorCurve.prototype.DrawPoints = function() 
{
  
  this.ctx.fillStyle = '#ffff00'; 
  this.ctx.beginPath(); 

  for(i=0;i<this.points.length;i++)
  { 
    this.ctx.moveTo(this.points[i].x*this.width,this.height-(this.points[i].y*this.height));
    this.ctx.arc(this.points[i].x*this.width,this.height-(this.points[i].y*this.height), 6, 0 , 2 * Math.PI, false);
    
  }
  this.ctx.fill();
  
}


ColorCurve.prototype.MouseDown = function(event) 
{
  
  if(!event) var event = window.event;
    var x = (event.offsetX)/this.width,
        y = (event.offsetY)/this.height;

  // add point
  if(event.shiftKey && !event.altKey) {
    var np = {
      x: x, 
      y: 1-y
    };

    var ps = [];
    var added = false;
    this.points.forEach(function(p) {
      if (!added && p.x > np.x) {
        ps.push(np);
        added = true;
      }
      ps.push(p);
    });
    this.points = ps;
    this.Draw();
    return;
  }

  dis = 10000;
  punto = -1;

  for (i=0;i<this.points.length;i++)
  {
    x1 = x-this.points[i].x;
    y1 = y-(1.0-this.points[i].y);
    tdis = x1*x1+y1*y1;
    tdis = Math.sqrt(tdis);
    
    if (tdis < dis) { 
      dis = tdis;
      punto = i;
    }
    
  }

  // remove point (but not, first, last or if there are less than 4)
  if(event.altKey && dis < 12.0) {
    if(this.points.length > 3 && punto != 0 && punto != this.points.length - 1) {

      var ps = [];
      var i = 0;
      this.points.forEach(function(p) {
        if(i != punto) {
          ps.push(p);
        }
        i++;
      });
      this.points = ps;
      this.Draw();
    }
    return;
  }
  this.currentpoint = (dis < 12.0) ? punto : this.currentpoint;  

}

ColorCurve.prototype.MouseDoubleClick = function(event) 
{
  
  if(!event) var event = window.event;
    var x = (event.offsetX)/this.width,
        y = (event.offsetY)/this.height;

  console.log(x, y);
}


ColorCurve.prototype.MouseUp = function(event) {
   
  if (this.currentpoint != -1) { 
    this.UpdateValues();
  }
  this.currentpoint = -1;

}

ColorCurve.prototype.MouseMove = function(event) {
   
  if (this.currentpoint == -1) return;

  if (this.currentpoint > 0) prevx = this.points[this.currentpoint-1].x; else prevx = 0;
  if (this.currentpoint==this.points.length-1) nextx = 1.0; else nextx = this.points[this.currentpoint+1].x; 
  
  x = (event.offsetX)/this.width;
    y = 1.0-((event.offsetY)/this.height);

     if(x > prevx && x < nextx) {
  
      if(this.currentpoint != 0 && this.currentpoint != this.points.length - 1) {
        this.points[this.currentpoint].x = x;
      }
      this.points[this.currentpoint].y = y;
  
    this.redraw = 1;    
  }



}

// Return the normalized Y value for the specified X value. X should be passed normnalized too
ColorCurve.prototype.GetY = function(xpos)
{
  return this.curve.interpolate(xpos);
}

ColorCurve.prototype.getPoints = function() {
  return this.points;
}





