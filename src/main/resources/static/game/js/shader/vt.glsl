varying vec3 vColor;
uniform float time;
uniform float size;
uniform float progress;
uniform vec3 target;
uniform float radian;
uniform float cutStart;
uniform float cutEnd;
attribute float percent;
attribute vec3 color;

void main() {
    vec3 dispatchPos;

    float p = min(progress, 1.);
    float rp = p >= percent ? percent : p;

    if(rp > cutStart && rp < cutEnd) {
        rp = cutStart;
    }
    dispatchPos = position + (target - position) * rp;
    dispatchPos.y *= sin(rp * 0.4) * radian;

    vColor = color;

    vec4 viewPosition = modelViewMatrix * vec4(dispatchPos, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = size;
    gl_PointSize *= (120. / -(modelViewMatrix * vec4(dispatchPos, 1.0)).z);
    gl_PointSize *= (0.2 + rp);
}