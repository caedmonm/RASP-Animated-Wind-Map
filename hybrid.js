var inc = 0.1;
var incStart = 0.005;
var magInc = 0.0005;
var start = 0;
var scl = 3;
var cols, rows;
var zoff = 0;
var fps;
var particles = [];
var numParticles = 10000;
var flowfield;
var flowcolorfield;
var magOff = 0;
var showField = false;
var exactFollow = true;
var maxAge = 150;

const showStars = true;
let starMap;

let stars;
let windD;
let windS;
let windMax = 0;

const starColours = [
	"#0000FF",
	"#00FFFF",
	"#08B30F",
	"#F8FD00",
	"#FFA800",
	"#FF0500",
	"#FF0000",
];

const windColours = {
	0: "#0000FF",
	1: "#0000FF",
	2: "#0000FF",
	3: "#0000FF",
	4: "#0074FF",
	5: "#0074FF",
	6: "#00E8FF",
	7: "#00E8FF",
	8: "#03E3A8",
	9: "#03E3A8",
	10: "#07C13B",
	11: "#07C13B",
	12: "#49C70B",
	13: "#49C70B",
	14: "#B6E904",
	15: "#B6E904",
	16: "#FFF100",
	17: "#FFF100",
	18: "#FFC800",
	19: "#FFC800",
	20: "#FF9B00",
	21: "#FF9B00",
	22: "#FF5000",
	23: "#FF5000",
	24: "#FF0500",
	25: "#FF0500",
	26: "#B8003A",
	max: "#B8003A",
};

function splitDataFile(raw) {
	let data = raw.slice(4, -1).reverse();
	data = data.map((row) => {
		return row.split(" ");
	});

	if (!cols) {
		cols = data[0].length;
		rows = data.length;
	}

	let out = [];
	data.forEach((row, y) => {
		row.forEach((col, x) => {
			let index = x + y * cols;
			out[index] = Number(col);
		});
	});

	return out;
}

function preload() {
	stars = loadStrings("./data_files/stars.curr.1300lst.d2.data");
	windD = loadStrings("./data_files/sfcwinddir.curr.1300lst.d2.data");
	windS = loadStrings("./data_files/sfcwindspd.curr.1300lst.d2.data"
	);
}

function setup() {
	stars = splitDataFile(stars);
	windD = splitDataFile(windD);
	windS = splitDataFile(windS);

	windS.forEach((s) => {
		if (s > windMax) {
			windMax = s;
		}
	});

	pixelDensity(1);
	createCanvas(cols * scl, rows * scl);

	background(0);

	for (let i = 0; i < numParticles; i++) {
		particles[i] = new Particle();
	}

	flowfield = new Array(rows * cols);
	flowcolorfield = new Array(rows * cols);

	if (showStars) {
		starMap = createImage(cols * scl, rows * scl);
		starMap.loadPixels();
		console.log("cols:", cols);
		for (let y = 0; y < rows * scl; y++) {
			for (let x = 0; x < cols * scl; x++) {
				let index = Math.floor(x / scl) + Math.floor(y / scl) * cols;
				let col = starColours[Math.floor(stars[index])];
				if (col !== undefined) {
					starMap.set(x, y, color(col));
				} else {
					starMap.set(x, y, color("#ff6600"));
				}
			}
		}
		starMap.updatePixels();
	}
}

function draw() {

	if (showField) {
		background(starMap);
	} else {
		tint(255, 20); // Apply transparency without changing color
		image(starMap, 0, 0);
	}

	var yoff = start;
	for (let y = 0; y < rows; y++) {
		let xoff = start;
		for (let x = 0; x < cols; x++) {
			let index = x + y * cols;

			let angle = radians(windD[index] - 90);
			// angle = radians(180 - 90);

			let v = p5.Vector.fromAngle(angle); // vector from angle
			let m = windS[index] / 10;
			v.setMag(m);
			if (showField) {
				push();
				stroke(255);
				translate(x * scl, y * scl);
				rotate(v.heading());
				let endpoint = abs(m) * scl;
				line(0, 0, endpoint, 0);
				if (m > 1) {
					stroke("red");
				} else {
					stroke("green");
				}
				line(endpoint - 2, 0, endpoint, 0);
				pop();
			}
			flowfield[index] = v;
			if (windColours[Math.floor(windS[index])]) {
				flowcolorfield[index] = windColours[Math.floor(windS[index])];
			} else {
				flowcolorfield[index] = windColours.max;
			}

			xoff += inc;
		}
		yoff += inc;
	}
	magOff += magInc;
	zoff += incStart;
	start -= magInc;

	if (!showField) {
		for (let i = 0; i < particles.length; i++) {
			particles[i].follow(flowfield, flowcolorfield);
			particles[i].update();
			particles[i].edges();
			particles[i].show();
		}

		if (random(10) > 5 && particles.length < 2500) {
			let rnd = floor(noise(zoff) * 20);
			for (let i = 0; i < rnd; i++) {
				particles.push(new Particle());
			}
		} else if (particles.length > 2000) {
			let rnd = floor(random(10));
			for (let i = 0; i < rnd; i++) {
				particles.shift();
			}
		}
	}
}

function Particle() {
	this.pos = createVector(random(width), random(height));
	this.vel = createVector(0, 0);
	this.acc = createVector(0, 0);
	this.age = 0;
	this.maxSpeed = 2;
	this.maxAge = maxAge * Math.random();

	this.prevPos = this.pos.copy();

	this.update = function () {
		if (exactFollow) {
			this.pos.add(this.vel);
		} else {
			this.vel.add(this.acc);
			this.vel.limit(this.maxSpeed);
			this.pos.add(this.vel);
			this.acc.mult(0);
		}
		this.age++;
		if (this.age > this.maxAge) {
			this.pos = createVector(random(width), random(height));
			this.vel = createVector(0, 0);
			this.acc = createVector(0, 0);
			this.age = 0;
			this.maxAge = maxAge * Math.random();
			this.prevPos.x = this.pos.x;
			this.prevPos.y = this.pos.y;
		}
	};

	this.applyForce = function (force) {
		if (exactFollow) {
			this.vel = force;
		} else {
			this.acc.add(force);
		}
	};

	this.show = function (colorfield) {
		strokeWeight(1);
		line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
		this.updatePrev();
		//point(this.pos.x, this.pos.y);
	};

	this.inverseConstrain = function (pos, key, f, t) {
		if (pos[key] < f) {
			pos[key] = t;
			this.updatePrev();
		}
		if (pos[key] > t) {
			pos[key] = f;
			this.updatePrev();
		}
	};

	this.updatePrev = function () {
		this.prevPos.x = this.pos.x;
		this.prevPos.y = this.pos.y;
	};

	this.edges = function () {
		this.inverseConstrain(this.pos, "x", 0, width);
		this.inverseConstrain(this.pos, "y", 0, height);
	};

	this.follow = function (vectors, colorfield) {
		let x = floor(this.pos.x / scl);
		let y = floor(this.pos.y / scl);
		let index = x + y * cols;
		let force = vectors[index];
		this.applyForce(force);
		let c = colorfield[index];
		if (c) {
			stroke(c);
		}
	};
}
