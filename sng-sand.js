(() => {
	"use strict";

	const canvas = document.getElementById("sand");
	const ctx = canvas.getContext("2d", { alpha: false });
	const logoImage = document.getElementById("sngLogoSource");

	const pourRateInput = document.getElementById("pourRate");
	const reposeInput = document.getElementById("repose");
	const cohesionInput = document.getElementById("cohesion");

	const pourValue = document.getElementById("pourValue");
	const reposeValue = document.getElementById("reposeValue");
	const cohesionValue = document.getElementById("cohesionValue");
	const angleReadout = document.getElementById("angleReadout");

	const resetButton = document.getElementById("reset");
	const pauseButton = document.getElementById("pause");

	const SIM_W = 600;
	const SIM_H = 338;

	const EMPTY = 0;
	const COMPACT = 1;
	const LOOSE_GOLD = 2;
	const LOOSE_PINK = 3;
	const DARK_SAND = 4;

	const MAX_DUST = 1400;
	const MAX_STREAM = 900;

	const material = new Uint8Array(SIM_W * SIM_H);
	const moved = new Uint8Array(SIM_W * SIM_H);
	const staticNoise = new Uint8Array(SIM_W * SIM_H);

	const dustX = new Float32Array(MAX_DUST);
	const dustY = new Float32Array(MAX_DUST);
	const dustVX = new Float32Array(MAX_DUST);
	const dustVY = new Float32Array(MAX_DUST);
	const dustLife = new Float32Array(MAX_DUST);
	const dustMax = new Float32Array(MAX_DUST);
	const dustPink = new Uint8Array(MAX_DUST);
	let dustCount = 0;

	const streamX = new Float32Array(MAX_STREAM);
	const streamY = new Float32Array(MAX_STREAM);
	const streamVX = new Float32Array(MAX_STREAM);
	const streamVY = new Float32Array(MAX_STREAM);
	const streamLife = new Float32Array(MAX_STREAM);
	const streamPink = new Uint8Array(MAX_STREAM);
	let streamCount = 0;

	const sandLayer = document.createElement("canvas");
	sandLayer.width = SIM_W;
	sandLayer.height = SIM_H;

	const sandCtx = sandLayer.getContext("2d", { willReadFrequently: true });
	const image = sandCtx.createImageData(SIM_W, SIM_H);
	const pixels = image.data;

	const shadowLayer = document.createElement("canvas");
	shadowLayer.width = SIM_W;
	shadowLayer.height = SIM_H;
	const shadowCtx = shadowLayer.getContext("2d");

	let dpr = 1;
	let viewW = 1;
	let viewH = 1;
	let drawX = 0;
	let drawY = 0;
	let drawW = 1;
	let drawH = 1;

	let pointerDown = false;
	let pointerX = SIM_W * 0.64;
	let pointerY = SIM_H * 0.24;
	let paused = false;
	let frame = 0;

	for (let i = 0; i < staticNoise.length; i++) {
		staticNoise[i] = hash8(i);
	}

	resize();
	reset();
	if (!logoImage.complete || !logoImage.naturalWidth) {
		logoImage.addEventListener("load", reset, { once: true });
	}
	requestAnimationFrame(loop);

	function id(x, y) {
		return y * SIM_W + x;
	}

	function hash8(value) {
		value ^= value >>> 16;
		value = Math.imul(value, 0x7feb352d);
		value ^= value >>> 15;
		value = Math.imul(value, 0x846ca68b);
		value ^= value >>> 16;
		return value & 255;
	}

	function reset() {
		material.fill(EMPTY);
		dustCount = 0;
		streamCount = 0;
		frame = 0;

		const mask = document.createElement("canvas");
		mask.width = SIM_W;
		mask.height = SIM_H;

		const m = mask.getContext("2d", { willReadFrequently: true });
		m.clearRect(0, 0, SIM_W, SIM_H);
		m.fillStyle = "#fff";
		m.textAlign = "center";
		m.textBaseline = "middle";

		if (logoImage.complete && logoImage.naturalWidth) {
			const maxWidth = SIM_W * 0.76;
			const maxHeight = SIM_H * 0.54;
			const scale = Math.min(
				maxWidth / logoImage.naturalWidth,
				maxHeight / logoImage.naturalHeight
			);
			const logoWidth = logoImage.naturalWidth * scale;
			const logoHeight = logoImage.naturalHeight * scale;
			m.drawImage(
				logoImage,
				SIM_W * 0.55 - logoWidth / 2,
				SIM_H * 0.535 - logoHeight / 2,
				logoWidth,
				logoHeight
			);
		} else {
			const fontSize = Math.floor(SIM_H * 0.43);
			m.font = `900 ${fontSize}px Arial Black, Impact, system-ui, sans-serif`;
			m.save();
			m.translate(SIM_W * 0.55, SIM_H * 0.535);
			m.scale(1.03, 1.43);
			m.fillText("SNG", 0, 0);
			m.restore();
		}

		const maskData = m.getImageData(0, 0, SIM_W, SIM_H).data;

		for (let y = 0; y < SIM_H; y++) {
			for (let x = 0; x < SIM_W; x++) {
				const alpha = maskData[(y * SIM_W + x) * 4 + 3];

				if (alpha > 40) {
					const n = staticNoise[id(x, y)];
					material[id(x, y)] = n > 18 ? COMPACT : LOOSE_GOLD;
				}
			}
		}

		buildInitialPowderFoot();
		renderSandLayer();
	}

	function buildInitialPowderFoot() {
		const baseY = Math.floor(SIM_H * 0.795);

		for (let x = 60; x < SIM_W - 28; x++) {
			const leftMound = gaussian(x, 208, 58) * 42;
			const centerMound = gaussian(x, 330, 92) * 20;
			const rightMound = gaussian(x, 430, 76) * 31;
			const noise = (staticNoise[id(x, baseY)] / 255) * 5;
			const height = Math.floor(leftMound + centerMound + rightMound + noise + 3);

			for (let k = 0; k < height; k++) {
				const y = Math.min(SIM_H - 2, baseY + k);

				if (staticNoise[id(x, y)] > 18) {
					material[id(x, y)] = LOOSE_GOLD;
				}
			}
		}

		for (let x = 0; x < SIM_W; x++) {
			for (let y = Math.floor(SIM_H * 0.875); y < SIM_H; y++) {
				if (staticNoise[id(x, y)] > 186) {
					material[id(x, y)] = DARK_SAND;
				}
			}
		}
	}

	function gaussian(x, center, spread) {
		const d = (x - center) / spread;
		return Math.exp(-d * d);
	}

	function loop() {
		requestAnimationFrame(loop);

		if (!paused) {
			frame++;

			if (pointerDown) {
				pourAt(pointerX);
			} else if (frame % 22 === 0) {
				microSettle();
			}

			const simSteps = pointerDown ? 5 : 3;

			for (let i = 0; i < simSteps; i++) {
				simulate();
			}

			updateParticles();
			renderSandLayer();
		}

		draw();
	}

	function pourAt(x) {
		const rate = Number(pourRateInput.value);
		const sourceX = clamp(Math.round(x), 8, SIM_W - 9);
		const sourceY = 18;

		for (let i = 0; i < rate; i++) {
			const sx = clamp(sourceX + randInt(-6, 6), 2, SIM_W - 3);
			const sy = clamp(sourceY + randInt(-2, 2), 2, SIM_H - 3);

			if (material[id(sx, sy)] === EMPTY) {
				material[id(sx, sy)] = Math.random() < 0.66 ? LOOSE_PINK : LOOSE_GOLD;
			}

			addStream(
				sourceX + rand(-4, 4),
				5 + rand(-2, 2),
				rand(-0.26, 0.26),
				rand(1.4, 2.25),
				rand(18, 32),
				Math.random() < 0.72
			);
		}

		const impactY = findFirstSolid(sourceX);
		erode(sourceX, impactY, 14, 0.17, true);
	}

	function microSettle() {
		const x = randInt(128, SIM_W - 70);
		const y = randInt(86, Math.floor(SIM_H * 0.72));

		erode(x, y, 4, 0.022, false);
	}

	function erode(cx, cy, radius, strength, pink) {
		const cohesion = Number(cohesionInput.value);
		const r2 = radius * radius;

		for (
			let y = Math.max(2, cy - radius);
			y <= Math.min(SIM_H - 3, cy + radius);
			y++
		) {
			for (
				let x = Math.max(2, cx - radius);
				x <= Math.min(SIM_W - 3, cx + radius);
				x++
			) {
				const dx = x - cx;
				const dy = y - cy;
				const d2 = dx * dx + dy * dy;

				if (d2 > r2) {
					continue;
				}

				const index = id(x, y);
				const falloff = 1 - d2 / r2;

				if (
					material[index] === COMPACT &&
					Math.random() < strength * falloff * (1.18 - cohesion)
				) {
					material[index] = pink && Math.random() < 0.43 ? LOOSE_PINK : LOOSE_GOLD;
					addDust(x, y, pink);
				}
			}
		}
	}

	function undermine(cx, cy) {
		const radius = 21;

		erode(cx, cy, radius, 0.92, false);

		for (let y = Math.max(3, cy - 8); y <= Math.min(SIM_H - 4, cy + 8); y++) {
			for (let x = Math.max(3, cx - 16); x <= Math.min(SIM_W - 4, cx + 16); x++) {
				const dx = (x - cx) / 16;
				const dy = (y - cy) / 8;

				if (dx * dx + dy * dy < 1 && Math.random() < 0.34) {
					const index = id(x, y);

					if (material[index] !== EMPTY) {
						material[index] = EMPTY;
						addDust(x, y, false);
					}
				}
			}
		}
	}

	function simulate() {
		moved.fill(0);

		const repose = Number(reposeInput.value);
		const flowChance = clamp((50 - repose) / 22, 0.12, 0.95);

		for (let y = SIM_H - 3; y >= 2; y--) {
			const leftToRight = ((frame + y) & 1) === 0;

			for (let ix = 2; ix < SIM_W - 2; ix++) {
				const x = leftToRight ? ix : SIM_W - 1 - ix;
				const index = id(x, y);
				const m = material[index];

				if (m !== LOOSE_GOLD && m !== LOOSE_PINK && m !== DARK_SAND) {
					continue;
				}

				if (moved[index] === 1) {
					continue;
				}

				const below = id(x, y + 1);

				if (material[below] === EMPTY) {
					move(index, below);
					continue;
				}

				const preferLeft = (hash8(index + frame * 17) & 1) === 0;
				const dxA = preferLeft ? -1 : 1;
				const dxB = -dxA;

				const downA = id(x + dxA, y + 1);
				const downB = id(x + dxB, y + 1);

				if (material[downA] === EMPTY && Math.random() < flowChance) {
					move(index, downA);
					continue;
				}

				if (material[downB] === EMPTY && Math.random() < flowChance) {
					move(index, downB);
					continue;
				}

				const sideA = id(x + dxA, y);
				const sideB = id(x + dxB, y);

				if (material[sideA] === EMPTY && Math.random() < flowChance * 0.075) {
					move(index, sideA);
				} else if (
					material[sideB] === EMPTY &&
					Math.random() < flowChance * 0.075
				) {
					move(index, sideB);
				}
			}
		}

		stressCompactGlyph();
	}

	function stressCompactGlyph() {
		const cohesion = Number(cohesionInput.value);
		const attempts = 340;

		for (let i = 0; i < attempts; i++) {
			const x = randInt(3, SIM_W - 4);
			const y = randInt(32, Math.floor(SIM_H * 0.77));
			const index = id(x, y);

			if (material[index] !== COMPACT) {
				continue;
			}

			const unsupported =
				material[id(x, y + 1)] === EMPTY ||
				material[id(x - 1, y + 1)] === EMPTY ||
				material[id(x + 1, y + 1)] === EMPTY;

			const looseNear =
				material[id(x - 1, y)] > COMPACT ||
				material[id(x + 1, y)] > COMPACT ||
				material[id(x, y - 1)] > COMPACT ||
				material[id(x, y + 1)] > COMPACT;

			const edge =
				material[id(x - 1, y)] === EMPTY ||
				material[id(x + 1, y)] === EMPTY ||
				material[id(x, y - 1)] === EMPTY ||
				material[id(x, y + 1)] === EMPTY;

			const chance =
				(unsupported ? 0.027 : 0) + (looseNear ? 0.018 : 0) + (edge ? 0.004 : 0);

			if (Math.random() < chance * (1.1 - cohesion)) {
				material[index] = Math.random() < 0.12 ? LOOSE_PINK : LOOSE_GOLD;
				addDust(x, y, false);
			}
		}
	}

	function move(from, to) {
		material[to] = material[from];
		material[from] = EMPTY;
		moved[to] = 1;
	}

	function findFirstSolid(x) {
		for (let y = 16; y < SIM_H - 4; y++) {
			if (material[id(x, y)] !== EMPTY) {
				return y;
			}
		}

		return Math.floor(SIM_H * 0.62);
	}

	function addDust(x, y, pink) {
		const count = pink ? 4 : 3;

		for (let i = 0; i < count; i++) {
			if (dustCount >= MAX_DUST) {
				dustCount = MAX_DUST - 1;
			}

			const index = dustCount++;
			dustX[index] = x + rand(-2, 2);
			dustY[index] = y + rand(-2, 2);
			dustVX[index] = rand(-0.72, 0.72);
			dustVY[index] = rand(-1.35, -0.22);
			dustLife[index] = rand(24, 62);
			dustMax[index] = 62;
			dustPink[index] = pink ? 1 : 0;
		}
	}

	function addStream(x, y, vx, vy, life, pink) {
		if (streamCount >= MAX_STREAM) {
			streamCount = MAX_STREAM - 1;
		}

		const index = streamCount++;
		streamX[index] = x;
		streamY[index] = y;
		streamVX[index] = vx;
		streamVY[index] = vy;
		streamLife[index] = life;
		streamPink[index] = pink ? 1 : 0;
	}

	function updateParticles() {
		for (let i = dustCount - 1; i >= 0; i--) {
			dustX[i] += dustVX[i];
			dustY[i] += dustVY[i];
			dustVX[i] *= 0.985;
			dustVY[i] += 0.045;
			dustLife[i]--;

			if (dustLife[i] <= 0 || dustY[i] > SIM_H + 12) {
				removeDust(i);
			}
		}

		for (let i = streamCount - 1; i >= 0; i--) {
			streamX[i] += streamVX[i];
			streamY[i] += streamVY[i];
			streamVY[i] += 0.035;
			streamLife[i]--;

			if (streamLife[i] <= 0 || streamY[i] > SIM_H) {
				removeStream(i);
			}
		}
	}

	function removeDust(i) {
		const last = --dustCount;

		dustX[i] = dustX[last];
		dustY[i] = dustY[last];
		dustVX[i] = dustVX[last];
		dustVY[i] = dustVY[last];
		dustLife[i] = dustLife[last];
		dustMax[i] = dustMax[last];
		dustPink[i] = dustPink[last];
	}

	function removeStream(i) {
		const last = --streamCount;

		streamX[i] = streamX[last];
		streamY[i] = streamY[last];
		streamVX[i] = streamVX[last];
		streamVY[i] = streamVY[last];
		streamLife[i] = streamLife[last];
		streamPink[i] = streamPink[last];
	}

	function renderSandLayer() {
		for (let y = 0; y < SIM_H; y++) {
			for (let x = 0; x < SIM_W; x++) {
				const index = id(x, y);
				const offset = index * 4;
				const m = material[index];

				if (m === EMPTY) {
					pixels[offset] = 0;
					pixels[offset + 1] = 0;
					pixels[offset + 2] = 0;
					pixels[offset + 3] = 0;
					continue;
				}

				const n = staticNoise[index];

				const leftEmpty = material[id(Math.max(0, x - 1), y)] === EMPTY ? 1 : 0;
				const rightEmpty =
					material[id(Math.min(SIM_W - 1, x + 1), y)] === EMPTY ? 1 : 0;
				const upEmpty = material[id(x, Math.max(0, y - 1))] === EMPTY ? 1 : 0;
				const downEmpty =
					material[id(x, Math.min(SIM_H - 1, y + 1))] === EMPTY ? 1 : 0;

				let shade = 0.88 + (n - 128) * 0.00215;

				// Directional light from upper-left.
				shade += leftEmpty * 0.08;
				shade += upEmpty * 0.06;
				shade -= rightEmpty * 0.055;
				shade -= downEmpty * 0.04;

				// Ambient occlusion inside compacted mass.
				if (!leftEmpty && !rightEmpty && !upEmpty && !downEmpty) {
					shade *= m === COMPACT ? 0.98 : 0.94;
				}

				if (m === COMPACT) {
					shade += 0.035;
				}

				// Micro-grain speckle. This is the powder read.
				if ((n & 31) === 0) {
					shade *= 1.2;
				} else if ((n & 27) === 0) {
					shade *= 0.72;
				}

				shade = clamp(shade, 0.44, 1.34);

				let r;
				let g;
				let b;

				if (m === COMPACT) {
					r = 12 + (n % 24);
					g = 174 + (n % 42);
					b = 84 + (n % 28);
				} else if (m === LOOSE_PINK) {
					r = 104 + (n % 30);
					g = 74 + (n % 34);
					b = 226 + (n % 29);
				} else if (m === DARK_SAND) {
					r = 25 + (n % 22);
					g = 58 + (n % 24);
					b = 39 + (n % 18);
				} else {
					r = 190 + (n % 30);
					g = 226 + (n % 29);
					b = 42 + (n % 34);
				}

				pixels[offset] = clampByte(r * shade);
				pixels[offset + 1] = clampByte(g * shade);
				pixels[offset + 2] = clampByte(b * shade);
				pixels[offset + 3] = 255;
			}
		}

		sandCtx.putImageData(image, 0, 0);

		// Softly unify nearby pixels so it reads as fine sand, not square pixels.
		sandCtx.save();
		sandCtx.globalAlpha = 0.18;
		sandCtx.filter = "blur(0.65px)";
		sandCtx.drawImage(sandLayer, 0, 0);
		sandCtx.restore();

		buildShadowMask();
	}

	function buildShadowMask() {
		shadowCtx.clearRect(0, 0, SIM_W, SIM_H);
		shadowCtx.save();
		shadowCtx.globalCompositeOperation = "source-over";
		shadowCtx.filter = "blur(4px)";
		shadowCtx.drawImage(sandLayer, 0, 0);
		shadowCtx.restore();
	}

	function draw() {
		ctx.setTransform(1, 0, 0, 1, 0, 0);

		const background = ctx.createLinearGradient(0, 0, 0, viewH);
		background.addColorStop(0, "#050507");
		background.addColorStop(0.55, "#070707");
		background.addColorStop(1, "#020202");

		ctx.fillStyle = background;
		ctx.fillRect(0, 0, viewW, viewH);

		ctx.save();
		ctx.translate(drawX, drawY);
		ctx.scale(drawW / SIM_W, drawH / SIM_H);

		const glow = ctx.createRadialGradient(
			SIM_W * 0.56,
			SIM_H * 0.78,
			0,
			SIM_W * 0.56,
			SIM_H * 0.78,
			SIM_W * 0.56
		);

		glow.addColorStop(0, "rgba(17, 191, 104, 0.24)");
		glow.addColorStop(0.35, "rgba(198, 255, 56, 0.07)");
		glow.addColorStop(1, "rgba(17, 191, 104, 0)");

		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, SIM_W, SIM_H);

		ctx.save();
		ctx.globalAlpha = 0.28;
		ctx.globalCompositeOperation = "multiply";
		ctx.drawImage(shadowLayer, 5, 8);
		ctx.restore();

		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(sandLayer, 0, 0);

		drawStream();
		drawDust();
		drawFunnel();

		ctx.restore();

		const vignette = ctx.createRadialGradient(
			viewW * 0.56,
			viewH * 0.46,
			viewW * 0.1,
			viewW * 0.56,
			viewH * 0.46,
			viewW * 0.72
		);

		vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
		vignette.addColorStop(0.64, "rgba(0, 0, 0, 0.16)");
		vignette.addColorStop(1, "rgba(0, 0, 0, 0.76)");

		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, viewW, viewH);
	}

	function drawFunnel() {
		const x = pointerX;
		const y = 16;

		ctx.save();
		ctx.translate(x, y);

		ctx.fillStyle = "rgba(31, 28, 25, 0.96)";
		ctx.strokeStyle = "rgba(198, 255, 56, 0.35)";
		ctx.lineWidth = 1.15;

		ctx.beginPath();
		ctx.moveTo(-25, -21);
		ctx.lineTo(25, -21);
		ctx.lineTo(8, 6);
		ctx.lineTo(-8, 6);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = "rgba(19, 17, 16, 0.98)";
		ctx.fillRect(-4.5, 5, 9, 16);

		ctx.restore();
	}

	function drawStream() {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";

		for (let i = 0; i < streamCount; i++) {
			const alpha = clamp(streamLife[i] / 30, 0, 1);

			ctx.fillStyle = streamPink[i]
				? `rgba(116, 87, 255, ${0.58 * alpha})`
				: `rgba(198, 255, 56, ${0.5 * alpha})`;

			ctx.fillRect(streamX[i], streamY[i], 1.35, 1.35);
		}

		ctx.restore();
	}

	function drawDust() {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";

		for (let i = 0; i < dustCount; i++) {
			const a = clamp(dustLife[i] / dustMax[i], 0, 1);
			const radius = dustPink[i] ? 1.35 : 1.05;

			ctx.fillStyle = dustPink[i]
				? `rgba(116, 87, 255, ${0.3 * a})`
				: `rgba(198, 255, 56, ${0.24 * a})`;

			ctx.beginPath();
			ctx.arc(dustX[i], dustY[i], radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}

	function pointerToSim(event) {
		const rect = canvas.getBoundingClientRect();
		const cx = (event.clientX - rect.left) * dpr;
		const cy = (event.clientY - rect.top) * dpr;

		pointerX = clamp(((cx - drawX) / drawW) * SIM_W, 4, SIM_W - 5);
		pointerY = clamp(((cy - drawY) / drawH) * SIM_H, 4, SIM_H - 5);
	}

	canvas.addEventListener("pointerdown", (event) => {
		pointerDown = true;
		pointerToSim(event);
		canvas.setPointerCapture(event.pointerId);
	});

	canvas.addEventListener("pointermove", (event) => {
		pointerToSim(event);

		if (pointerDown && event.buttons === 2) {
			undermine(pointerX | 0, pointerY | 0);
		}
	});

	canvas.addEventListener("pointerup", (event) => {
		pointerDown = false;
		canvas.releasePointerCapture(event.pointerId);
	});

	canvas.addEventListener("pointercancel", () => {
		pointerDown = false;
	});

	canvas.addEventListener("dblclick", (event) => {
		pointerToSim(event);
		undermine(pointerX | 0, pointerY | 0);
	});

	canvas.addEventListener("contextmenu", (event) => {
		event.preventDefault();
	});

	pourRateInput.addEventListener("input", () => {
		pourValue.textContent = pourRateInput.value;
	});

	reposeInput.addEventListener("input", () => {
		const value = `${reposeInput.value}°`;
		reposeValue.textContent = value;
		angleReadout.textContent = value;
	});

	cohesionInput.addEventListener("input", () => {
		cohesionValue.textContent = Number(cohesionInput.value).toFixed(2);
	});

	resetButton.addEventListener("click", reset);

	pauseButton.addEventListener("click", () => {
		paused = !paused;
		pauseButton.textContent = paused ? "Продолжить" : "Пауза";
	});

	window.addEventListener("resize", resize);

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);

		viewW = Math.floor(window.innerWidth * dpr);
		viewH = Math.floor(window.innerHeight * dpr);

		canvas.width = viewW;
		canvas.height = viewH;
		canvas.style.width = `${window.innerWidth}px`;
		canvas.style.height = `${window.innerHeight}px`;

		const scale = Math.min(viewW / SIM_W, viewH / SIM_H) * 1.04;

		drawW = SIM_W * scale;
		drawH = SIM_H * scale;

		// Keep the play area dominant. The HUD is now an overlay, not a layout owner.
		drawX = (viewW - drawW) * 0.52;
		drawY = (viewH - drawH) * 0.51;

		if (window.innerWidth < 760) {
			drawX = (viewW - drawW) * 0.5;
			drawY = (viewH - drawH) * 0.35;
		}
	}

	function rand(min, max) {
		return min + Math.random() * (max - min);
	}

	function randInt(min, max) {
		return Math.floor(rand(min, max + 1));
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function clampByte(value) {
		return value < 0 ? 0 : value > 255 ? 255 : value | 0;
	}
})();
