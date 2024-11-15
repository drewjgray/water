const path = require('path');
const webpack = require('webpack');

module.exports = {
    configureWebpack: {
        resolve: {
            alias: {
                'three$': path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js'),
                'three/tsl': path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js'),
                'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm')
            }
        },
        plugins: [
            new webpack.DefinePlugin({
                __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
                __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
                __VUE_OPTIONS_API__: JSON.stringify(true)
            })
        ]
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