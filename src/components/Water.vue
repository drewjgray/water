<template>
    <div ref="container" class="water-container">
        <div id="info">
            <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> WebGPU - Backdrop Water
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { 
  color, 
  vec2, 
  pass, 
  linearDepth, 
  normalWorld, 
  triplanarTexture, 
  texture, 
  objectPosition, 
  screenUV, 
  viewportLinearDepth, 
  viewportDepthTexture, 
  viewportSharedTexture, 
  mx_worley_noise_float, 
  positionWorld, 
  time 
} from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
// import Stats from 'three/addons/libs/stats.module.js'

// Import your assets
import waterTexture from '../assets/textures/water.jpg'

// Refs
const container = ref(null)

// Three.js variables
let camera, scene, renderer, objects, clock, floor
let postProcessing, controls, stats, animationFrameId


const init = async () => {
    if (!navigator.gpu) {
        alert('WebGPU not supported! Please use a WebGPU-enabled browser.')
        return
    }
    // Camera setup
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.25, 30)
    camera.position.set(3, 2, 4)

    // Scene setup
    scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0487e2, 7, 25)
    scene.backgroundNode = normalWorld.y.mix(color(0x0487e2), color(0x0066ff))
    camera.lookAt(0, 1, 0)

    // Lights
    const sunLight = new THREE.DirectionalLight(0xFFE499, 5)
    sunLight.castShadow = true
    sunLight.shadow.camera.near = .1
    sunLight.shadow.camera.far = 5
    sunLight.shadow.camera.right = 2
    sunLight.shadow.camera.left = -2
    sunLight.shadow.camera.top = 1
    sunLight.shadow.camera.bottom = -2
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.bias = -0.001
    sunLight.position.set(.5, 3, .5)

    const waterAmbientLight = new THREE.HemisphereLight(0x333366, 0x74ccf4, 5)
    const skyAmbientLight = new THREE.HemisphereLight(0x74ccf4, 0, 1)

    scene.add(sunLight)
    scene.add(skyAmbientLight)
    scene.add(waterAmbientLight)

    // Initialize clock
    clock = new THREE.Clock()

    // Create objects
    const textureLoader = new THREE.TextureLoader()
    const iceDiffuse = textureLoader.load(waterTexture)
    iceDiffuse.wrapS = THREE.RepeatWrapping
    iceDiffuse.wrapT = THREE.RepeatWrapping
    iceDiffuse.colorSpace = THREE.NoColorSpace

    const iceColorNode = triplanarTexture(texture(iceDiffuse)).add(color(0x0066ff)).mul(.8)

    const geometry = new THREE.IcosahedronGeometry(1, 3)
    const material = new THREE.MeshStandardNodeMaterial({ colorNode: iceColorNode })

    // const count = 100
    // const scale = 3.5
    // const column = 10

    // objects = new THREE.Group()

    // for (let i = 0; i < count; i++) {
    //     const x = i % column
    //     const y = i / column

    //     const mesh = new THREE.Mesh(geometry, material)
    //     mesh.position.set(x * scale, 0, y * scale)
    //     mesh.rotation.set(Math.random(), Math.random(), Math.random())
    //     objects.add(mesh)
    // }

    // objects.position.set(
    //     ((column - 1) * scale) * -.5,
    //     -1,
    //     ((count / column) * scale) * -.5
    // )

    // scene.add(objects)

    // Water setup
    const timer = time.mul(.8)
    const floorUV = positionWorld.xzy

    const waterLayer0 = mx_worley_noise_float(floorUV.mul(4).add(timer))
    const waterLayer1 = mx_worley_noise_float(floorUV.mul(2).add(timer))

    const waterIntensity = waterLayer0.mul(waterLayer1)
    const waterColor = waterIntensity.mul(1.4).mix(color(0x0487e2), color(0x74ccf4))

    const depth = linearDepth()
    const depthWater = viewportLinearDepth.sub(depth)
    const depthEffect = depthWater.remapClamp(-.002, .04)

    const refractionUV = screenUV.add(vec2(0, waterIntensity.mul(.1)))
    const depthTestForRefraction = linearDepth(viewportDepthTexture(refractionUV)).sub(depth)
    const depthRefraction = depthTestForRefraction.remapClamp(0, .1)
    const finalUV = depthTestForRefraction.lessThan(0).select(screenUV, refractionUV)
    const viewportTexture = viewportSharedTexture(finalUV)

    const waterMaterial = new THREE.MeshBasicNodeMaterial()
    waterMaterial.colorNode = waterColor
    waterMaterial.backdropNode = depthEffect.mix(
        viewportSharedTexture(),
        viewportTexture.mul(depthRefraction.mix(1, waterColor))
    )
    waterMaterial.backdropAlphaNode = depthRefraction.oneMinus()
    waterMaterial.transparent = true

    const water = new THREE.Mesh(
        new THREE.BoxGeometry(50, .001, 50),
        waterMaterial
    )
    water.position.set(0, 0, 0)
    scene.add(water)

    // Floor
    floor = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 10),
        new THREE.MeshStandardNodeMaterial({ colorNode: iceColorNode })
    )
    floor.position.set(0, -5, 0)
    scene.add(floor)

    // Caustics
    const waterPosY = positionWorld.y.sub(water.position.y)
    let transition = waterPosY.add(.1).saturate().oneMinus()
    transition = waterPosY.lessThan(0).select(
        transition,
        normalWorld.y.mix(transition, 0)
    ).toVar()

    const colorNode = transition.mix(
        material.colorNode,
        material.colorNode.add(waterLayer0)
    )

    floor.material.colorNode = colorNode

    // Renderer setup
    renderer = new THREE.WebGPURenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.value.appendChild(renderer.domElement)

    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = 1
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI * 0.9
    controls.autoRotate = true
    controls.autoRotateSpeed = 1
    controls.target.set(0, .2, 0)
    controls.update()

    // Post processing
    const scenePass = pass(scene, camera)
    const scenePassColor = scenePass.getTextureNode()
    const scenePassDepth = scenePass.getLinearDepthNode().remapClamp(.3, .5)

    const waterMask = objectPosition(camera).y.greaterThan(screenUV.y.sub(.5).mul(camera.near))

    const scenePassColorBlurred = gaussianBlur(scenePassColor)
    scenePassColorBlurred.directionNode = waterMask.select(
        scenePassDepth,
        scenePass.getLinearDepthNode().mul(5)
    )

    const vignet = screenUV.distance(.5).mul(1.35).clamp().oneMinus()

    postProcessing = new THREE.PostProcessing(renderer)
    postProcessing.outputNode = waterMask.select(
        scenePassColorBlurred,
        scenePassColorBlurred.mul(color(0x74ccf4)).mul(vignet)
    )


    animate()
}

const animate = async () => {
    animationFrameId = requestAnimationFrame(animate)
    controls.update()

    const delta = clock.getDelta()

    for (const object of objects?.children || []) {
        object.position.y = Math.sin(clock.elapsedTime + object.id) * 0.3
        object.rotation.y += delta * 0.3
    }

    await postProcessing.renderAsync()
}

const handleResize = () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }
}

onMounted(async () => {
    await init()
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
    }
    window.removeEventListener('resize', handleResize)
    
    if (renderer) {
        renderer?.dispose?.()
    }
    if (postProcessing) {
        postProcessing.outputNode?.dispose?.()
    }
})
</script>

<style scoped>
.water-container {
    width: 100%;
    height: 100vh;
    position: relative;
}

#info {
    position: absolute;
    top: 10px;
    width: 100%;
    text-align: center;
    color: white;
    z-index: 100;
    display: block;
}

#info a {
    color: #f00;
    font-weight: bold;
    text-decoration: underline;
    cursor: pointer;
}
</style>
