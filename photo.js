// Photo module — Canvas 2D group photo for start screen
// Draws three block-style characters: "快乐童年"

export function drawGroupPhoto(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Sky gradient background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#87CEEB');
  skyGrad.addColorStop(0.7, '#B0E0E6');
  skyGrad.addColorStop(1, '#90EE90');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Green ground
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, h - 40, w, 40);
  ctx.fillStyle = '#388E3C';
  ctx.fillRect(0, h - 40, w, 4);

  // Draw three characters
  drawPerson(ctx, w * 0.3, h - 40, 28, 44, '#E57373', '#FFCDD2', '#8D6E63'); // Left child
  drawPerson(ctx, w * 0.5, h - 40, 36, 56, '#64B5F6', '#BBDEFB', '#5D4037'); // Middle parent
  drawPerson(ctx, w * 0.7, h - 40, 28, 44, '#81C784', '#C8E6C9', '#6D4C41'); // Right child

  // Simple sun
  ctx.fillStyle = '#FFF176';
  ctx.beginPath();
  ctx.arc(w - 30, 30, 18, 0, Math.PI * 2);
  ctx.fill();
  // Sun rays
  ctx.strokeStyle = '#FFF176';
  ctx.lineWidth = 2;
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w - 30 + Math.cos(angle) * 22, 30 + Math.sin(angle) * 22);
    ctx.lineTo(w - 30 + Math.cos(angle) * 30, 30 + Math.sin(angle) * 30);
    ctx.stroke();
  }
}

function drawPerson(ctx, x, groundY, width, height, shirtColor, skinColor, hairColor) {
  const bodyH = height * 0.45;
  const legH = height * 0.3;
  const headH = height * 0.25;
  const headW = width * 0.7;
  const bodyW = width * 0.75;
  const legW = width * 0.4;

  // Legs (dark pants)
  ctx.fillStyle = '#455A64';
  ctx.fillRect(x - legW / 2, groundY - legH, legW, legH);
  ctx.fillRect(x - legW / 2, groundY - legH, legW, legH * 0.3); // Shoes

  // Shoes
  ctx.fillStyle = '#37474F';
  ctx.fillRect(x - legW / 2 - 1, groundY - legH * 0.3, legW * 0.45, legH * 0.3);
  ctx.fillRect(x + 1, groundY - legH * 0.3, legW * 0.45, legH * 0.3);

  // Body (shirt)
  ctx.fillStyle = shirtColor;
  ctx.fillRect(x - bodyW / 2, groundY - legH - bodyH, bodyW, bodyH);

  // Arms
  const armW = width * 0.15;
  ctx.fillStyle = skinColor;
  ctx.fillRect(x - bodyW / 2 - armW, groundY - legH - bodyH * 0.8, armW, bodyH * 0.8);
  ctx.fillRect(x + bodyW / 2, groundY - legH - bodyH * 0.8, armW, bodyH * 0.8);

  // Head
  ctx.fillStyle = skinColor;
  ctx.fillRect(x - headW / 2, groundY - legH - bodyH - headH, headW, headH);

  // Hair
  ctx.fillStyle = hairColor;
  ctx.fillRect(x - headW / 2, groundY - legH - bodyH - headH, headW, headH * 0.4);

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(x - headW * 0.25, groundY - legH - bodyH - headH * 0.55, 2, 2);
  ctx.fillRect(x + headW * 0.12, groundY - legH - bodyH - headH * 0.55, 2, 2);

  // Smile
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(x - headW * 0.18, groundY - legH - bodyH - headH * 0.32, headW * 0.36, 1);
}
