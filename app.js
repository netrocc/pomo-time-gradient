/*
 * ...
 * NETRO
 * https://netro.cc/
 *
 */

function App() {

	var container;
	var renderer, scene, camera, clock;
	var uniforms;

	var vecMinus = new THREE.Vector2(-1, -1);
	var vecZero = new THREE.Vector2(0, 0);

	var mouseDown = false;
	var mouseStart = new THREE.Vector2();
	var mousePosition = new THREE.Vector2();
	var mousePrevPos = new THREE.Vector2();
	var lerpCounter = 0.0;

	var timeOffset = 0.0;
	var timeOffsetStep = 0.0;

	//AUDIO
	var fileType;
	var distortion;
	var audioCounter = 0.0;

	//UI
	var divHours, divMinutes, divSeconds;
	var colorAmplifier;
	var invertColors = false;


	function initialize() {
		container = document.getElementById('container');
		divHours = document.getElementById('hours');
		divMinutes = document.getElementById('minutes');
		divSeconds = document.getElementById('seconds');

		colorAmplifier = document.getElementById('colorAmplifier');

		//AUDIO
		var a = document.createElement('audio');
		if (!!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''))) fileType = 'mp3';
		else if (!!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''))) fileType = 'ogg';
		else fileType = 'wav';

		distortion = context.createWaveShaper();

		loadSounds(this, {
			tick: '/assets/audio/9.wav' //ADD FILETYPE VARIABLE
		}, function() {
			play();
		});

		//THREE.JS
		scene = new THREE.Scene();
		camera = new THREE.Camera();
		camera.position.z = 1;

		clock = new THREE.Clock();

		var geometry = new THREE.PlaneBufferGeometry(2, 2);

		uniforms = {
			iGlobalTime: { type: "f", value: 1.0 },
			iResolution: { type: "v2", value: new THREE.Vector2() },
			hours: { type: "v2", value: new THREE.Vector2() },
			minutes: { type: "v2", value: new THREE.Vector2() },
			seconds: { type: "v2", value: new THREE.Vector2() },
			mouse: { type: "v2", value: new THREE.Vector2() },
			click: { type: "v2", value: new THREE.Vector2() },
			invertColors: { type: "i", value: 0 },
			colorAmplifier: { type: "f", value: 4.0 }
		};

		var material = new THREE.ShaderMaterial({
			uniforms: uniforms,
			vertexShader: document.getElementById('vertexShader').textContent,
			fragmentShader: document.getElementById('fragmentShader').textContent
		});

		var mesh = new THREE.Mesh(geometry, material);
    	scene.add(mesh);

		renderer = new THREE.WebGLRenderer();
		container.appendChild(renderer.domElement);

		//EVENTS
		onWindowResize();
		animate();

		window.addEventListener('resize', onWindowResize, false);

		container.addEventListener('mousedown', onMouseDown, false);
		container.addEventListener('mouseup', onMouseUp, false);
		container.addEventListener('mousemove', onMouseMove, false);
		
		document.addEventListener('keypress', onKeyPress, false);
		colorAmplifier.addEventListener('input', function(event) {
			uniforms.colorAmplifier.value = colorAmplifier.value;
		}, false);
	}

	function animate() {
		requestAnimationFrame(animate);
		render();
	}

	function render() {
		uniforms.iGlobalTime.value = clock.getElapsedTime();

		if (!mouseDown && lerpCounter > 0.0) {
			var tmpPos = new THREE.Vector2();
			tmpPos.lerpVectors(mouseStart, mousePosition, easeInQuad(lerpCounter));

			uniforms.mouse.value = tmpPos;

			lerpCounter -= 0.0125;
		}

		if (!mouseDown && audioCounter > 0.0) {
			audioCounter -= 0.0125;
		}
		
		var dist = mouseStart.distanceTo(mousePosition);
		distortion.curve = makeDistortionCurve(dist * 20.0 * easeInQuad(audioCounter));


		if (!mouseDown && timeOffset != 0.0) {
			if (timeOffset < 0.0) {
				timeOffset -= timeOffsetStep;
				if (timeOffset >= 0.0) timeOffset = 0.0;
			}

			if (timeOffset > 0.0) {
				timeOffset -= timeOffsetStep;
				if (timeOffset <= 0.0) timeOffset = 0.0;
			}
		}

		var date = new Date();

		date.setSeconds(date.getSeconds() + timeOffset);

		var hours = date.getHours();
		var minutes = date.getMinutes();
		var seconds = date.getSeconds();
		var milliSeconds = date.getMilliseconds();

		//console.log(hours + ":" + minutes + ":" + seconds + "," + milliSeconds);
		
		var h = ((hours*60.0 + minutes)*60.0 + seconds + milliSeconds*0.001) / 86400.0;
		var m = (minutes*60.0 + seconds + milliSeconds*0.001) / 3600.0;
		var s = (seconds + milliSeconds*0.001) / 60.0;

		//console.log(h + ":" + m + ":" + s);

		var h12 = h < 0.5 ? h * 2.0 : (h - 0.5) * 2.0;
		var hDeg = 2.0 * Math.PI * h12;
		var mDeg = 2.0 * Math.PI * m;
		var sDeg = 2.0 * Math.PI * s;

		//console.log(hDeg + ":" + mDeg + ":" + sDeg);

		var hX = 0.5 + Math.sin(hDeg) * 0.1;
		var hY = 0.5 + Math.cos(hDeg) * 0.1;
		var mX = 0.5 + Math.sin(mDeg) * 0.2;
		var mY = 0.5 + Math.cos(mDeg) * 0.2;
		var sX = 0.5 + Math.sin(sDeg) * 0.3;
		var sY = 0.5 + Math.cos(sDeg) * 0.3;

		//console.log(hX + ":" + hY + ", " + mX + ":" + mY + ", " + sX + ":" + sY);

		var hoursVec = new THREE.Vector2(hX, hY);
		var minutesVec = new THREE.Vector2(mX, mY);
		var secondsVec = new THREE.Vector2(sX, sY);

		uniforms.hours.value = hoursVec;
		uniforms.minutes.value = minutesVec;
		uniforms.seconds.value = secondsVec;

		renderer.render(scene, camera);

		// DIGITS
		divHours.innerHTML = addLeading(hours);
		divMinutes.innerHTML = addLeading(minutes);
		divSeconds.innerHTML = addLeading(seconds);

		var cx = container.clientWidth*0.5;
		var cy = container.clientHeight*0.5;

		divHours.style.left = cx + Math.cos(hDeg-0.5*Math.PI)*container.clientWidth*0.2 + 'px';
		divHours.style.top = cy + Math.sin(hDeg-0.5*Math.PI)*container.clientHeight*0.2 + 'px';
		
		divMinutes.style.left = cx + Math.cos(mDeg-0.5*Math.PI)*container.clientWidth*0.3 + 'px';
		divMinutes.style.top = cy + Math.sin(mDeg-0.5*Math.PI)*container.clientHeight*0.3 + 'px';

		divSeconds.style.left = cx + Math.cos(sDeg-0.5*Math.PI)*container.clientWidth*0.4 + 'px';
		divSeconds.style.top = cy + Math.sin(sDeg-0.5*Math.PI)*container.clientHeight*0.4 + 'px';
	}

	function addLeading(num) {
		if (num < 10) return "0" + num;
		else return num;
	}

	/*
	 *	EVENTS
	 */

	function onWindowResize(event) {
		uniforms.iResolution.value.x = container.clientWidth;
		uniforms.iResolution.value.y = container.clientHeight;

		renderer.setSize(container.clientWidth, container.clientHeight);
	}

	function onMouseMove(event) {
		var mouseX = event.pageX;
		var mouseY = event.pageY;

		if (mouseDown) {
			if (lerpCounter <= 0.0) {
				mousePosition.x = mouseX/container.clientWidth;
				mousePosition.y = 1-mouseY/container.clientHeight;
			} else {
				var stepX = mousePrevPos.x - (mouseX/container.clientWidth);
				var stepY = mousePrevPos.y - (1-mouseY/container.clientHeight);

				mousePosition.x -= stepX*0.5;
				mousePosition.y -= stepY*0.5;

				mousePrevPos.x = mouseX/container.clientWidth;
				mousePrevPos.y = 1-mouseY/container.clientHeight;
			}
			uniforms.mouse.value = mousePosition;

			var dist = mouseStart.distanceTo(mousePosition);
			var dx = mousePosition.x - mouseStart.x < 0.0 ? -1.0 : 1.0;
			var dy = mousePosition.y - mouseStart.y < 0.0 ? -1.0 : 1.0;
			timeOffset = dist*12000.0*dx; //shift speed
			timeOffsetStep = timeOffset / 50.0; //rewind speed
		}
	}

	function onMouseDown(event) {
		mouseDown = true;
		audioCounter = 1.0;

		var mouseX = event.pageX;
		var mouseY = event.pageY;

		if (lerpCounter <= 0.0) {
			mouseStart.x = mouseX/container.clientWidth;
			mouseStart.y = 1-mouseY/container.clientHeight;

			mousePosition.x = mouseX/container.clientWidth;
			mousePosition.y = 1-mouseY/container.clientHeight;
		} else {
			mousePrevPos.x = mouseX/container.clientWidth;
			mousePrevPos.y = 1-mouseY/container.clientHeight;

			mousePosition.lerpVectors(mouseStart, mousePosition, easeInQuad(lerpCounter));
		}

		uniforms.mouse.value = mousePosition;
		uniforms.click.value = mouseStart;
	}

	function onMouseUp(event) {
		mouseDown = false;
		lerpCounter = 1.0;

		//uniforms.mouse.value = vecMinus;
	}

	function onKeyPress(event) {
		console.log(event.keyCode);
		switch(event.keyCode) {
			case 105:
				invertColors = !invertColors;
				if (invertColors) uniforms.invertColors.value = 1;
				else uniforms.invertColors.value = 0;
				break;
			default: break;
		}
	}

	/*
	 *	EASING
	 */

	function easeInQuad(t) {
    	return t*t;
	}

	function easeOutQuad(t) {
		return t*(2-t);
	}


	/*
	 *	AUDIO
	 */

	function play() {
		//playSound(this.tick, 0.0, true);

		// Create the source.
		var source = context.createBufferSource();
		source.buffer = this.tick;

		//source.connect(context.destination);
		/*
		// Create the filter.
		var filter = context.createBiquadFilter();
		filter.type = filter.LOWPASS;
		filter.frequency.value = 5000;
		// Connect source to filter, filter to destination.
		source.connect(filter);
		filter.connect(context.destination);
		*/

		
		

		source.connect(distortion);
		distortion.connect(context.destination);

		distortion.curve = makeDistortionCurve(0);

		// Play!
		source[source.start ? 'start' : 'noteOn'](0);
		source.loop = true;
		// Save source and filterNode for later access.
		this.source = source;
		//this.filter = filter;
	}

	function makeDistortionCurve(amount) {
		var k = typeof amount === 'number' ? amount : 50;
		var n_samples = 44100;
		var curve = new Float32Array(n_samples);
		var deg = Math.PI / 180;
		var x;
		for (var i=0 ; i < n_samples; ++i ) {
			x = i * 2 / n_samples - 1;
			curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
		}
		return curve;
	}

	
	return {
		initialize: initialize
	};
}

var app = new App();
window.addEventListener('load', app.initialize, false);