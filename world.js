// whatif
// vítr

var world, eventhandler;
function init(){
	world = new World();
	var canvas = createCanvas( world.width*world.tileSize,world.height*world.tileSize );
	eventhandler = new Eventhandler(canvas.canvas);

	eventhandler.addKeyboardControl("G",undefined,function(){
		world.generate();
	});
	eventhandler.addKeyboardControl("T",undefined,function(){
		world.tectonicRender(canvas.ctx)
	});
	eventhandler.addKeyboardControl("H",undefined,function(){
		world.heightmapRender(canvas.ctx)
	});
	eventhandler.addKeyboardControl("R",undefined,function(){
		world.moveTectonicsPlates(10);
	});

	document.body.appendChild(canvas.canvas);
}

function generate2Darray(width, height, defaultValue){
	var array = [];
	for(var y=0;y<height;y++){
		array[y] = [];
		for(var x=0;x<width;x++){
			array[y][x] = defaultValue;
		}
	}
	return array;
}

function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

function createCanvas(w, h){
	var canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");
	return {canvas: canvas, ctx: ctx, width: w, height: h};
}

function randomInt(min, max){
	return Math.floor( Math.random()*(max-min)+min );
}

function for2d(array, func){
	for(var y=0;y<array.length;y++){
		for(var x=0;x<array[0].length;x++){
			func(x,y);
		}
	}
}


function World(){
	// nastavení
	this.tileSize = 14;
	this.width = Math.round(1000/this.tileSize);
	this.height = Math.round(700/this.tileSize);
	// 0 - 128 depth
	this.terrainDepth = 48;
	this.maxDepth = 256;
	this.minDepth = 0;
	// tektonic
	this.tectonicsPlatesMax = 60;
	this.tectonicsPlatesMin = 50;
	this.tectonicsPlatesGlueTries = 5;

	this.meteoritesNumber = 10;

	this.tectonicsYears = 100;

	this.generate();
}

World.prototype.generate = function() {
	var _this = this;
	// tektonické desky
	this.tectonicsPlates = generate2Darray(this.width, this.height, 0);
	// základy částí tektonických desek
	this.tectonicsPlatesCoords = [];
	this.tectonicsPlatesNumber = randomInt(this.tectonicsPlatesMin, this.tectonicsPlatesMax);
	for(var plate=1;plate<=this.tectonicsPlatesNumber;plate++){
		var y = randomInt(0, this.height);
		var x = randomInt(0, this.width);
		this.tectonicsPlates[y][x] = plate;
		this.tectonicsPlatesCoords.push({coords: new Vector2(x,y), type: plate});
	}
	// spojení několika tektonických desek
	for(var p=0;p<this.tectonicsPlatesGlueTries;p++){
		for(var u in this.tectonicsPlatesCoords){
			var spojovanyPlate = this.tectonicsPlatesCoords[u];
			// tři nejbližší
			var neighbours = [ {},{},{} ];

			for(var plate in this.tectonicsPlatesCoords){
				if(spojovanyPlate == this.tectonicsPlatesCoords[plate])
					continue;
				// var length = this.tectonicsPlatesCoords[plate].coords.distanceToSquared( spojovanyPlate.coords );
				var length = this.loopDistance(this.tectonicsPlatesCoords[plate].coords, spojovanyPlate.coords)
				var type = this.tectonicsPlatesCoords[plate].type;
				for(var n in neighbours){
					if(neighbours[n].type === undefined){
						neighbours[n].type = type;
						neighbours[n].length = length;
					}
					var is_in = false;
					if(neighbours[n].length > length){
						neighbours[n].type = type;
						neighbours[n].length = length;
						break;
					}
				}
			}
			var neighbourTypes = {};
			var choose = "random";
			for(var n in neighbours){
				if(neighbourTypes[ neighbours[n].type ] === undefined)
					neighbourTypes[ neighbours[n].type ] = 0;
				neighbourTypes[ neighbours[n].type ]++;
			}
			for(var n in neighbourTypes){
				if(neighbourTypes[n] > 1){
					var choose = n;
				}
			}
			if(choose == "random")
				spojovanyPlate.type = neighbours[ randomInt(0, neighbours.length) ].type;
			else
				spojovanyPlate.type = choose;
				
		}
	}
	var types = [];
	// přečíslování
	for(var plate=0;plate<this.tectonicsPlatesCoords.length;plate++){
		var index = types.indexOf(this.tectonicsPlatesCoords[plate].type);
		if(index < 0){
			types.push(this.tectonicsPlatesCoords[plate].type);
			this.tectonicsPlatesCoords[plate].type = types.length-1;
		}
		else {
			this.tectonicsPlatesCoords[plate].type = index;
		}
	}
	this.tectonicsPlatesNumber = types.length;
	// vyplnění prostor
	for2d(this.tectonicsPlates, function(x,y){
		var minplate = false;
		var minlength = 0;
		for(var plate in _this.tectonicsPlatesCoords){
			var length = _this.loopDistance(_this.tectonicsPlatesCoords[plate].coords, new Vector2(x,y));
			// var length = _this.tectonicsPlatesCoords[plate].coords.distanceToSquared( new Vector2(x,y) )
			// var length = Math.abs(_this.tectonicsPlatesCoords[plate].coords.x-x)+Math.abs(_this.tectonicsPlatesCoords[plate].coords.y-y);
			if(minplate === false){
				minplate = _this.tectonicsPlatesCoords[plate].type;
				minlength = length;
			}
			if(minlength > length){
				minplate = _this.tectonicsPlatesCoords[plate].type;
				minlength = length;
			}
		}
		_this.tectonicsPlates[y][x] = minplate;
	});
	// vytvoření mezer
	for2d(this.tectonicsPlates, function(x,y){
		var plate = _this.tectonicsPlates[y][x];
		var comb = [0,-1,1];
		for(var cx=0;cx<3;cx++){
			for(var cy=0;cy<3;cy++){
				if(cx != 0 && cy != 0)
					continue;
				var lx = loop(x+comb[cx],_this.width-1);
				var ly = loop(y+comb[cy],_this.height-1);
				var neighbour = _this.tectonicsPlates[ly][lx];
				if(neighbour !== plate && neighbour !== -1){
					console.log(neighbour, plate, lx, ly, x, y)
					_this.tectonicsPlates[y][x] = -1;
				}
			}
		}

	});

	// TODO: sesílání meteoritů
	this.heightMap = generate2Darray(this.width, this.height, this.terrainDepth);
	for(var m=0;m<this.meteoritesNumber;m++){
		this.raiseLand(randomInt(0,this.width), randomInt(0,this.height), randomInt(2,12))
	}

	// konfigurace tektonických desek
	this.tectonicsPlatesObjects = [];
	for(plate=0;plate<this.tectonicsPlatesNumber;plate++){
		this.tectonicsPlatesObjects[plate] = {
			type: plate,
			position: new Vector2(),
			velocity: new Vector2( Math.random()*0.2-0.1, Math.random()*0.2-0.1 ),
			size: 0,
			mass: 0,
			hustota: randomInt(3000, 10000),
			center: new Vector2(),
		}
	}
	for2d(this.tectonicsPlates, function(x,y){
		if(_this.tectonicsPlates[y][x] !== -1){
			var plate = _this.tectonicsPlatesObjects[ _this.tectonicsPlates[y][x] ];
			plate.size += 1;
			plate.center.addSelf( new Vector2(x,y) );
		}
	});

	for(plate=0;plate<this.tectonicsPlatesNumber;plate++){
		var p = this.tectonicsPlatesObjects[plate];
		p.center.divideScalar(p.size);
		p.mass = p.size * p.hustota;
	}

	console.log(this.tectonicsPlatesObjects)

	// pohyb tektonických desek
	// this.moveTectonicsPlates()
};

World.prototype.moveTectonicsPlates = function(years) {
	var _this = this;
	for(var year=0;year < years;year++){
		for(plate=0;plate<this.tectonicsPlatesNumber;plate++){
			var p = this.tectonicsPlatesObjects[plate]
			p.position.addSelf(p.velocity);
			if(p.position.x > 1 || p.position.y > 1){
				p.position.x = Math.round( p.position.x );
				p.position.y = Math.round( p.position.y );

				var newTectonicsPlates = generate2Darray(this.width, this.height, undefined);

				for2d(this.tectonicsPlates, function(x,y){
						var pole = _this.tectonicsPlates[y][x];
						if(pole == p.type){
							var lx = loop( x+p.position.x, _this.width-1 );
							var ly = loop( y+p.position.y, _this.height-1 );
							// var oldType = _this.tectonicsPlates[ly][lx];
							if(newTectonicsPlates[y][x] === undefined)
								newTectonicsPlates[y][x] = -1;
							newTectonicsPlates[ly][lx] = pole;

							// var crushp = _this.tectonicsPlatesObjects[oldType];
							// console.log(oldType, lx, ly);
							// velocityMap[ly][lx] = Math.abs(p.mass-crushp.mass);
						}
						else if(newTectonicsPlates[y][x] === undefined) {
							newTectonicsPlates[y][x] = pole;
						}
				});

				this.tectonicsPlates = newTectonicsPlates;
				p.position.set(0,0);
			}
		}
	}
};

function loop(value, max){
	if(value > max){
		return value % max;
	}
	// potřebuje doladit (hází to špatné values pro value < -max)
	else if(value < 0) {
		return max + ((value+1) % max);
	}
	else {
		return value;
	}
}

World.prototype.raiseLand = function(ex, ey, radius, func) {
	var _this = this;
	func = func === undefined ? function(r,p,maxr){return p*0.5 + r/maxr*100;} : func;
	var epicentrum = new Vector2(ex,ey);
	for2d(this.heightMap, function(x,y){
		var distance = epicentrum.distanceTo( new Vector2(x,y) );
		if(distance < radius){
			_this.heightMap[y][x] = func(distance, _this.heightMap[y][x], radius);
		}
	})
};

World.prototype.tectonicRender = function(ctx) {
	// var randColors = [
	// 	"#FAA434",
	// 	"#FAD70F",
	// 	"#FA460F",
	// 	"#F7E44F",
	// 	"#DB420F"
	// 	// "#1B7EE0"
	// ];
	var colors = [];
	for(var i=0;i<this.tectonicsPlatesNumber;i++){
		// colors.push( randColors[randomInt(0,randColors.length)] );
		colors.push( get_random_color() );
	}

	ctx.clearRect(0,0,this.width*this.tileSize, this.height*this.tileSize);
	ctx.font = "arial 8px";
	// rendering počátků tektonických desek
	// for(var i in this.tectonicsPlatesCoords){
	// 	var x = this.tectonicsPlatesCoords[i].coords.x;
	// 	var y = this.tectonicsPlatesCoords[i].coords.y;
	// 	ctx.fillStyle = "grey";
	// 	ctx.fillRect(x*this.tileSize,y*this.tileSize, this.tileSize, this.tileSize);
	// }
	for(var y=0;y<this.height;y++){
		for(var x=0;x<this.width;x++){
			if(this.tectonicsPlates[y][x] >= 0)
				ctx.fillStyle = colors[ this.tectonicsPlates[y][x] ];
			else
				ctx.fillStyle = "#000";
			ctx.fillRect(x*this.tileSize,y*this.tileSize, this.tileSize, this.tileSize);
			ctx.fillStyle = "#000";
			ctx.fillText(this.tectonicsPlates[y][x],x*this.tileSize,(y+1)*this.tileSize);
		}
	}
	for(var i in this.tectonicsPlatesObjects){
		ctx.fillStyle = "#FFFFFF";
		var p = this.tectonicsPlatesObjects[i];
		ctx.fillRect(p.center.x*this.tileSize, p.center.y*this.tileSize, this.tileSize, this.tileSize);
		ctx.fillStyle = "#000"
		ctx.fillText(p.type, p.center.x*this.tileSize, p.center.y*this.tileSize+8);

		ctx.beginPath();
		ctx.strokeStyle = "#F00";
		ctx.lineWidth = 2;
		ctx.moveTo(p.center.x*this.tileSize+this.tileSize/2,p.center.y*this.tileSize+this.tileSize/2);
		ctx.lineTo(p.center.x*this.tileSize+this.tileSize/2+p.velocity.x*this.tileSize*10,p.center.y*this.tileSize+this.tileSize/2+p.velocity.y*this.tileSize*10);
		ctx.stroke();
		ctx.closePath();
	}
};

World.prototype.heightmapRender = function(ctx) {
	var _this = this;
	var startHue = 107;
	var endHue = 30;
	var stepHue = ( startHue-endHue )/(this.maxDepth-this.minDepth);

	ctx.clearRect(0,0,this.width*this.tileSize, this.height*this.tileSize);
	ctx.font = "arial 8px";

	for2d(this.heightMap, function(x,y){
		ctx.fillStyle = "hsl("+(startHue - stepHue*_this.heightMap[y][x])+","+81+"%,"+50+"%)";
		// ctx.fillText(_this.heightMap[y][x],x*_this.tileSize,(y+1)*_this.tileSize);
		ctx.fillRect(x*_this.tileSize,y*_this.tileSize, _this.tileSize, _this.tileSize);
	})
};

World.prototype.loopDistance = function(v1, v2) {
	var distances = [];
	var comb = [0,-1,1];
	for(var x=0;x<3;x++){
		for(var y=0;y<3;y++){
			if(x != 0 && y != 0)
				continue;
			var new_distance = new Vector2().add( v1, new Vector2( this.width*comb[x], this.height*comb[y] ) );
			distances.push( new_distance.distanceToSquared(v2) );
		}
	}
	var min = Math.min.apply(null, distances);
	return min;
};