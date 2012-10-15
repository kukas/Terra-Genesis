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

function getNeighbours(array,y,x){
	var width = array.length,
		height = array[0].length;
	var left = (x-1 + width) % width,
		right = (x+1) % width,
		top = (y-1 + height) % height,
		bottom = (y+1) % height;

	var neighbours = [ array[left][top],
		array[left][y],
		array[left][bottom],
		array[x][top],
		array[x][bottom],
		array[right][top],
		array[right][y],
		array[right][bottom] ];

	return neighbours;
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
	this.width = 100;
	this.height = 60;
	this.tileSize = 10;
	// 0 - 128 depth
	this.terrainDepth = 48;
	// tektonic
	this.tectonicsPlatesMax = 70;
	this.tectonicsPlatesMin = 50;
	this.tectonicsPlatesGlueTries = 1;

	this.generate();
}

World.prototype.generate = function() {
	var _this = this;
	this.heightMap = generate2Darray(this.width, this.height, this.terrainDepth);

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
			var randomPlate = u;
			// tři nejbližší
			var neighbours = [ [],[],[] ];

			var minplate = false;
			var minlength = 0;
			for(var plate in this.tectonicsPlatesCoords){
				var length = this.tectonicsPlatesCoords[plate].coords.distanceToSquared( this.tectonicsPlatesCoords[randomPlate].coords )
				for(var n in neighbours){
					if(neighbours[n] == this.tectonicsPlatesCoords[plate])
						continue;
					if(neighbours[n].length === 0){
						minplate = this.tectonicsPlatesCoords[plate].type;
						minlength = length;
					}
					if(minlength > length && this.tectonicsPlatesCoords[plate].type != this.tectonicsPlatesCoords[randomPlate].type){
						minplate = this.tectonicsPlatesCoords[plate].type;
						minlength = length;
					}
				}
			}
			this.tectonicsPlatesCoords[randomPlate].type = minplate;
		}
	}
	// vyplnění prostor
	for2d(this.tectonicsPlates, function(x,y){
		var minplate = false;
		var minlength = 0;
		for(var plate in _this.tectonicsPlatesCoords){
			var length = _this.tectonicsPlatesCoords[plate].coords.distanceToSquared( new Vector2(x,y) )
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
};

World.prototype.tectonicRender = function(ctx) {
	var colors = [];
	for(var i=0;i<this.tectonicsPlatesNumber;i++){
		colors.push( get_random_color() );
	}

	ctx.clearRect(0,0,this.width*this.tileSize, this.height*this.tileSize)
	ctx.font = "arial 8px";
	for(var i in this.tectonicsPlatesCoords){
		var x = this.tectonicsPlatesCoords[i].coords.x;
		var y = this.tectonicsPlatesCoords[i].coords.y;
		ctx.fillStyle = "grey";
		ctx.fillRect(x*this.tileSize,y*this.tileSize, this.tileSize, this.tileSize);
	}
	for(var y=0;y<this.height;y++){
		for(var x=0;x<this.width;x++){
			ctx.fillStyle = colors[ this.tectonicsPlates[y][x]-1 ];
			ctx.fillText(this.tectonicsPlates[y][x],x*this.tileSize,(y+1)*this.tileSize);
		}
	}
};