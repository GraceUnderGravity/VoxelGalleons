import * as THREE from './vendor/three.module.js';
import {waveScale,waveGLSL} from './sea-state.js';

export function createSea(islands){
  const reflectionTarget=new THREE.WebGLRenderTarget(1024,1024,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  const mirror=new THREE.OrthographicCamera(),textureMatrix=new THREE.Matrix4();
  const uniforms={viewDirection:{value:new THREE.Vector3(0,1,1).normalize()},amplitude:{value:waveScale()},mood:{value:0},time:{value:0},islands:{value:islands.map(i=>new THREE.Vector3(i.x,i.z,i.r))},reflectionMap:{value:reflectionTarget.texture},reflectionMatrix:{value:textureMatrix}};
  const water=new THREE.Mesh(new THREE.PlaneGeometry(1500,1500,480,480),new THREE.ShaderMaterial({uniforms,
    vertexShader:`varying vec3 world;varying vec4 reflected;uniform mat4 reflectionMatrix;uniform float time,amplitude;uniform vec3 islands[6];${waveGLSL}void main(){vec4 p=modelMatrix*vec4(position,1.);float shore=1000.;for(int i=0;i<6;i++){vec2 q=p.xz-islands[i].xy;float a=atan(q.y,q.x),fi=float(i),coast=islands[i].z*(1.+.12*sin(a*3.+fi*1.37)+.065*sin(a*7.+fi*.61)+.027*sin(a*13.+fi*2.));shore=min(shore,length(q)-coast);}float shelter=.15+.85*smoothstep(1.,24.,shore);p.y+=oceanHeight(p.xz,time)*amplitude*shelter;world=p.xyz;reflected=reflectionMatrix*p;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`precision highp float;
      varying vec3 world;varying vec4 reflected;uniform float time,amplitude;uniform float mood;uniform vec3 islands[6];uniform vec3 viewDirection;uniform sampler2D reflectionMap;
      ${waveGLSL}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.62+noise(p*2.07+3.1)*.27+noise(p*4.1)*.11;}
      vec2 noiseGradient(vec2 p){
        vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
        vec2 du=30.*f*f*(f*(f-2.)+1.);
        float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
        return du*vec2(mix(b-a,d-c,u.y),mix(c-a,d-b,u.x));
      }
      // Small wind waves change the reflection normal, not the water colour.
      // Suppress wavelengths below two pixels rather than letting them shimmer.
      vec2 windRipples(vec2 p,float t,float footprint){
        vec2 slope=vec2(0.);float frequency=.65,weight=.11;
        for(int i=0;i<5;i++){
          float fi=float(i),angle=-.59+sin(fi*2.399)*.38;
          vec2 along=vec2(cos(angle),sin(angle)),across=vec2(-along.y,along.x);
          vec2 q=vec2(dot(p,along),dot(p,across)*.46)*frequency;
          q+=vec2(-t*.20*sqrt(frequency),t*.035)+fi*17.37;
          q+=vec2(noise(p*.13+fi),noise(p*.11-fi))*1.8;
          float resolved=1.-smoothstep(.8,2.5,frequency*footprint);
          vec2 gradient=noiseGradient(q);
          slope+=(along*gradient.x+across*gradient.y*.46)*weight*resolved;
          frequency*=2.03;weight*=.79;
        }
        return slope;
      }
      void main(){
        vec2 p=world.xz;
        float shore=1000.,coastAngle=0.;
        for(int i=0;i<6;i++){
          vec2 q=p-islands[i].xy;float a=atan(q.y,q.x),fi=float(i);
          float coast=islands[i].z*(1.+.12*sin(a*3.+fi*1.37)+.065*sin(a*7.+fi*.61)+.027*sin(a*13.+fi*2.));
          float d=length(q)-coast;if(d<shore){shore=d;coastAngle=a;}
        }
        // Depth, rather than high-contrast marbling, gives the sea its colour.
        float sandbar=(noise(p*.095)-.5)*2.1;
        float shallows=1.-smoothstep(1.,27.,shore+sandbar);
        vec3 deep=vec3(.035,.278,.303),lagoon=vec3(.20,.61,.55);
        vec3 col=mix(deep,lagoon,shallows*.87);
        float sand=1.-smoothstep(-.7,5.,shore);
        col=mix(col,vec3(.48,.72,.57),sand*.59);
        col+=vec3(.026,.041,.030)*(fbm(p*.025)-.5);

        float swell=p.x*.116+p.y*.051-time*.68+.4;
        float cross=p.y*.173-p.x*.069-time*.81+2.1;
        float sheltered=.15+.85*smoothstep(1.,24.,shore);
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        vec2 slopes=oceanSlope(p,time)*amplitude*sheltered*.32;
        slopes+=windRipples(p,time,footprint)*mix(.45,1.25,smoothstep(.3,5.,amplitude))*mix(.65,1.,sheltered);
        vec3 normal=normalize(vec3(-slopes.x,1.,-slopes.y));
        // White water only forms at steep, constructive wave crests.
        // Ordinary swells are visible through their changing reflection, not painted marks.
        vec2 drift=vec2(time*.018,-time*.012);
        float detailFade=1.-smoothstep(.35,1.1,length(fwidth(p)));
        float crestHeight=oceanHeight(p,time);
        float crest=smoothstep(.38,.54,crestHeight)*smoothstep(2.8,5.,amplitude);
        float froth=smoothstep(.48,.72,noise(p*2.5+vec2(time*.21,-time*.14)));
        col=mix(col,vec3(.42,.60,.58),crest*froth*.19*detailFade*(1.-sand));

        // A faint, broken glimmer belongs only to the sandy seabed.
        vec2 tile=floor(p*2.)/2.;
        float light=fbm(tile*.72+vec2(time*.10,-time*.065));
        float caustic=smoothstep(.61,.74,light)*(1.-smoothstep(4.,14.,shore))*smoothstep(-1.,2.,shore);
        col+=vec3(.044,.063,.028)*caustic;

        // Short shorebreak washes up and recedes along the actual coastline.
        float tide=sin(time*.80+coastAngle*2.)*.46+sin(time*1.2+coastAngle*5.)*.12;
        float wash=1.-smoothstep(.11,.65,abs(shore-tide-.22));
        float lace=.45+.55*noise(p*1.3+time*.13);
        float outer=(1.-smoothstep(.09,.32,abs(shore-1.25-tide*.5)))*smoothstep(.60,.80,noise(p*.7-time*.08))*.18;
        col=mix(col,vec3(.80,.87,.72),clamp(wash*lace*.46+outer,0.,.58));

        vec2 uv=reflected.xy/reflected.w;
        uv+=vec2(sin(p.y*2.2-time*1.5)*.00065+sin(p.y*.65+time)*.0010,sin(p.x*1.4+time*.7)*.00065);
        vec4 reflection=texture2D(reflectionMap,uv);
        float reflectedStrength=.38+sin(cross)*.035;
        vec3 tint=reflection.rgb*vec3(.66,.88,.81);
        col=mix(col,tint,reflection.a*reflectedStrength);
        // Orthographic rays are parallel, including at chart zoom.
        vec3 viewDir=viewDirection;
        vec3 moon=normalize(vec3(-.45,.65,.4));
        vec3 reflectedSky=reflect(-viewDir,normal);
        float skyBand=smoothstep(.18,.88,reflectedSky.y);
        float clouds=fbm(reflectedSky.xz*3.6+drift*.35);
        vec3 sky=mix(vec3(.030,.060,.075),vec3(.083,.153,.173),skyBand*(.82+clouds*.18));
        float fresnel=.10+.65*pow(1.-max(0.,dot(normal,viewDir)),3.);
        vec3 body=col*mix(vec3(1.),vec3(.15,.15,.16),mood);
        body*=.87+.20*max(0.,dot(normal,moon));
        col=body+sky*(.24+fresnel*.65);
        vec3 halfVector=normalize(moon+viewDir);
        float specular=pow(max(0.,dot(normal,halfVector)),120.);
        col+=vec3(.085,.115,.12)*specular;
        gl_FragColor=vec4(col,1.);
      }`
  }));water.rotation.x=-Math.PI/2;water.position.y=-.23;
  const tempColor=new THREE.Color(),reflectionClip=new THREE.Plane(new THREE.Vector3(0,1,0),.23);
  function renderReflection(renderer,scene,camera,lookAt){
    uniforms.amplitude.value=waveScale();
    camera.getWorldDirection(uniforms.viewDirection.value).negate();
    mirror.projectionMatrix.copy(camera.projectionMatrix);mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    mirror.position.copy(camera.position);mirror.position.y=-camera.position.y-.46;mirror.up.set(0,-1,0);mirror.lookAt(lookAt.x,-lookAt.y-.46,lookAt.z);mirror.updateMatrixWorld();
    textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    const original=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),shadowUpdate=renderer.shadowMap.autoUpdate,clipping=renderer.clippingPlanes;
    renderer.getClearColor(tempColor);water.visible=false;renderer.shadowMap.autoUpdate=false;
    const surfaceEffects=[];scene.traverse(o=>{if(o.visible&&o.userData.waterSurface){surfaceEffects.push(o);o.visible=false;}});
    renderer.clippingPlanes=[reflectionClip];renderer.setRenderTarget(reflectionTarget);renderer.setClearColor('#000000',0);renderer.clear();renderer.render(scene,mirror);
    renderer.clippingPlanes=clipping;renderer.setRenderTarget(original);renderer.setClearColor(tempColor,alpha);renderer.shadowMap.autoUpdate=shadowUpdate;water.visible=true;surfaceEffects.forEach(o=>o.visible=true);
  }
  return{water,renderReflection,resize(w,h){reflectionTarget.setSize(Math.min(1400,Math.floor(w)),Math.min(1100,Math.floor(h)));}};
}


