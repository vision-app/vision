const fs = require('fs-extra');
const path = require('path');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const detect = require('./detectEdges');
const nodeCanvas = require('canvas');
/**
 * minify an image, just support png
 *
 * @param {string} imgPath
 * @returns
 */
exports.minify = function minify(imgPath) {
    return imagemin([imgPath], {
        destination: path.dirname(imgPath),
        plugins: [imageminPngquant()],
    });
};

exports.smartCrop = function smartCrop(imgPath) {
    return nodeCanvas.loadImage(imgPath).then((image) => {
        // Create a canvas and draw the image onto it
        const { width, height } = image;
        // 临时裁掉圆角
        const clip = 2;
        const canvas = nodeCanvas.createCanvas(width - clip * 2, height - clip * 2);
        const context = canvas.getContext('2d');
        context.drawImage(image, -clip, -clip);

        // Detect edges
        let { top, right, bottom, left } = detect(canvas);
        // 保留最小边距
        const minMargin = Math.min(top, right, bottom, left);
        top -= minMargin;
        right -= minMargin;
        bottom -= minMargin;
        left -= minMargin;

        // Resize canvas and draw image at right position
        canvas.width = width - clip * 2 - (left + right);
        canvas.height = height - clip * 2 - (top + bottom);
        context.drawImage(image, -left - clip, -top - clip);

        return canvas;
    })
        .then((canvas) => new Promise((resolve, reject) => canvas.toBuffer((error, buffer) => {
            error ? reject(error) : resolve(buffer);
        }, 'image/png')))
        .then((buffer) => fs.writeFile(imgPath, buffer));
};
