const path = require('path');

module.exports = {
    configureWebpack: {
        resolve: {
            alias: {
                'three$': path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js'),
                'three/tsl': path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js'),
                'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm')
            }
        }
    },
    chainWebpack: config => {
        config.module
            .rule('glsl')
            .test(/\.(glsl|vs|fs|vert|frag)$/)
            .use('raw-loader')
            .loader('raw-loader')
            .end()
    }
}