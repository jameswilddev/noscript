function tick() {
}

function beat() {
}

function bar() {
}

function render() {
  additiveBlending()
  useProgram(starfieldProgram)
  uniformFloat(starfieldElapsed, elapsed)

  uniformVec2(starfieldScroll, elapsed * 0.3, 0)
  uniformVec2(starfieldScale, 0.8, 0.8)
  uniformFloat(starfieldRadius, 0.1)
  uniformFloat(starfieldLocationNoise, 0.8)
  uniformVec3(starfieldColor, 2, 2, 2)
  fillBackground()

  uniformVec2(starfieldScroll, elapsed * 0.2, 0)
  uniformVec2(starfieldScale, 1.4, 1.4)
  uniformFloat(starfieldRadius, 0.1)
  uniformFloat(starfieldLocationNoise, 0.8)
  uniformVec3(starfieldColor, 2, 2, 2)
  fillBackground()

  uniformVec2(starfieldScroll, elapsed * 0.1, 0)
  uniformVec2(starfieldScale, 2.1, 2.1)
  uniformFloat(starfieldRadius, 0.1)
  uniformFloat(starfieldLocationNoise, 0.8)
  uniformVec3(starfieldColor, 2, 2, 2)
  fillBackground()
}