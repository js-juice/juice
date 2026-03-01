import CustomDom from '../core/Dom/Custom.mjs';
import { Tpl } from '../core/HTML/Template.mjs'
import { avatarCSS, setupCSS, formButtonCSS } from './Styles.mjs';


window.URL = window.URL || window.webkitURL;

class AvatarGraphic {

    img;
    scale=1;

    movement = {x:0, y:0};
    position = {x:0, y:0};
    box = {x:0, y:0};
  

    static async fromURL( href ){

        const img =  new Image;

        const promise = new Promise((resolve, reject ) => {
            img.onload = () => {
                resolve(new AvatarGraphic(img));
            };
            img.onerror = () => {
                reject();
            }
        });

        img.src = href;

        return promise;
    }

    static fromImage( image ){

        const img = new Image;

        const promise = new Promise((resolve, reject ) => {
            img.onload = () => {
                resolve(new AvatarGraphic(img));
            };
            img.onerror = () => {
                reject();
            }
        });

        img.src = URL.createObjectURL(image);

        return promise;
    }

    constructor(img){
        this.img = img;
    }

    get nativeWidth(){
        return this.img.width;
    }

    get nativeHeight(){
        return this.img.height;
    }

    get width(){
        return Math.floor( this.img.width * this.scale );
    }

    get height(){
        return Math.floor( this.img.height * this.scale );
    }

    get aspect(){
        return this.img.width/this.img.height;
    }

    get x(){
        return this.position.x + this.movement.x;
    }

    get y(){
        return this.position.y + this.movement.y;
    }

    fitToBox( width, height ){
        this.box.width = width;
        this.box.height = height;
        if( this.aspect > 1 ){
            //Vert img
            this.scale = width / this.nativeWidth;
        }else{
            this.scale = height / this.nativeHeight;
        }

        this.position.x = Math.floor( (width - this.width) / 2 );
        this.position.y = Math.floor( (height - this.height) / 2 );
    }

    move( x, y ){
        this.movement.x = x;
        this.movement.y = y;
    }

    save(){
        this.position.x += this.movement.x;
        this.position.y += this.movement.y;
    }

}

class AvatarCreator extends CustomDom.HTMLElement {

    static tag = 'avatar-creator';
    graphics = [];
    graphicSelected = 0;

    static config ={
        properties: {
            size: { type: 'number', linked: true },
            user: { type: 'number', linked: true },
            saved: { type: 'string', linked: true, default: 'https://storage.googleapis.com/maldelo-dev/user/default/avatar-male.png' }
        }
    }

    static get style(){
        return [setupCSS, avatarCSS, formButtonCSS];
    }

    avatarList(){
        const list = [];
        for(let i=1;i<36;i++){
            list.push('avatar-'+i+'.png');
        }

        return list;
    }

    static html({ type="rect", fill="none", ...props }){
        return `

        <div class="preview">
            <ui-shape id="avatar-circle" class="inline-block" type="circle" stroke="#d2d2d2" stroke-width="5" stroke-offset="1" size="${this.size}" >
                <div class="safe" ref="safe"> 
                    <img id="current-avatar" ref="current-avatar" src="${this.saved != '' ? this.saved : 'https://storage.googleapis.com/maldelo-dev/user/default/avatar-male.png'}" />
                </div>
            </ui-shape>
            <form-color class="bg-color" ref="bg-input" value="#d0dbe4" title="Background Color" size="45" >
            <m-icon type="paint" size="25"></m-icon>
            </form-color>
            <form-color class="graphic-color" ref="graphic-color-input" value="#007bc7" title="Graphic Color" size="45" >
                    <m-icon type="profile" size="25"></m-icon>
            </form-color>
        </div>

        <div class="controls">
            <div class="control image">
            <form-range ref="scale-input" class="col-3-4 w-100" min="0.10" max="2.00" value="0.8" step="0.01" unit="x" label="Scale" ></form-range>
            </div>
            <div class="control create">
                <div class="flex-h initials">
                    <div class="flex-static rpadd-2">
                    <form-color ref="text-color-input" value="#007bc7" title="Text Color" size="30" >
                    <m-icon type="text" size="20"></m-icon>
                    </form-color>
                    </div>
                    <div class="flex-all w-100">
                    <input ref="text-input" class="h-100" type="text" maxlength="3" value="" placeholder="Initials" />
                    </div>
                </div>
                <div class="samples">
                    <ul>
                    ${ Tpl.repeat(
                        this.avatarList(),
                        ( item, index ) => index,
                        ( item, index ) => `
                        <li class="sample" style="background-image:url(/img/avatars/${item})" data-path="/img/avatars/${item}">
                           
                        </li>
                        `
                    ) }
                   
                    </ul>
                </div>
            </div>

        </div>
        <div class="actions">

            <div class="create-btn action flex-static tpadd-2">
                <a ref="create-btn" id="create-avatar" event="click::create()" class="button blue rounded w-100" >Create Avatar</a>
            </div>

            <div class="file-button action file-button tpadd-2">
                <file-button ref="file-btn" id="choose-avatar" class="button rounded blue w-100 bg--blue" label="Choose Image"></file-button>
            </div>

            <div class="save-btn action flex-static tpadd-2">
                <a ref="save-btn" id="save-avatar" event="click::save()" class="button green rounded w-100" >Save Avatar</a>
            </div>

            <div class="cancel-btn action flex-static tpadd-2">
                <a ref="cancel-btn" id="cancel-avatar" event="click::cancel()" class="button red rounded w-100" >Cancel</a>
            </div>
            
        </div>
        `;
    }

    static get observedProperties(){
        return ['size', 'saved', 'user' ];
    }

    static get observedAttributes(){
        return ['size', 'saved', 'user'];
    }

    create(){
        this.ref('html').classList.remove('initial');
        this.ref('html').classList.add('creating');
    }

    cancel(){
        this.ref('html').classList.remove('has-image');
        this.ref('html').classList.remove('has-text');
        this.ref('html').classList.remove('creating');
        this.ref('html').classList.remove('image');
        this.ref('html').classList.add('initial');

        this.ref('graphic-color-input').value = '';

        this.previewStyle = { backgroundColor: '#d0dbe4'};
        this.graphicProperties = { scale: 1, color: '#007bc7' };
    }

    save(){
        this.ref('html').classList.remove('creating');
        this.ref('html').classList.add('saving');
        let linked = this.base64;

        if(this.hasAttribute('linked')){
            linked = document.querySelector(this.getAttribute('linked'));
        }
        const dataUrl = this.canvas.toDataURL();
        linked.value = dataUrl;
        this.dispatchEvent(new Event('change'));
        linked.dispatchEvent(new Event('input'));
        
        this.ref('current-avatar').src = dataUrl;
        this.cancel();

    }
    
    update(){


        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const ctx = this.canvas.getContext('2d');

        const centerX = cw / 2;
        const centerY = ch / 2;

        ctx.clearRect(0, 0, cw, ch);

        console.log(this.previewStyle);

        for(let i=0;i<this.graphics.length;i++){
            
            const graphic = this.graphics[i];

            const scale = graphic.scale;
            let w = graphic.width * this.graphicProperties.scale;
            let h = graphic.height * this.graphicProperties.scale;
            let x = graphic.x + ((graphic.width - w)/2);
            let y = graphic.y + ((graphic.height - h)/2);
        
            //console.log(graphic.img, graphic.aspect, x, y, w, h );
            if(graphic.type !== 'import'){
            ctx.fillStyle = this.graphicProperties.color;
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalCompositeOperation = "destination-in";
        }
            ctx.drawImage( graphic.img, x, y, w, h );


            ctx.globalCompositeOperation = "source-over";
        }
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = this.previewStyle.backgroundColor;
        ctx.fillRect(0, 0, cw, ch);

        ctx.globalCompositeOperation = "source-over";

        if( this.previewStyle.text?.length){
            const fontSize = this.previewStyle.fontSize;
            ctx.letterSpacing = '5px';
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.font = `${fontSize}px proxima-nova-bold`;
            ctx.fillStyle = this.previewStyle.color;
            ctx.fillText(this.previewStyle.text, centerX, centerY);
        }

    }

    

    previewStyle = { backgroundColor: '#d0dbe4'};
    graphicProperties = { scale: 1, color: '#007bc7' };

    setup(){

        this.canvas = document.createElement('canvas');
        this.ref('safe').appendChild(this.canvas);
        this.canvas.width = this.size - 10;
        this.canvas.height = this.size - 10;

        let movement = {x:0,y:0};

        const onDrag = ({ pageX, pageY }) => {
            movement.x = pageX - movement.sx;
            movement.y = pageY - movement.sy;
            this.graphics[this.graphicSelected].move(movement.x, movement.y);
            
            console.log('dragging', movement.x, movement.y);
            this.update();
        }

        const onDragStop = (e) => {
            this.ref('html').classList.remove('dragging');
            this.graphics[this.graphicSelected].save();
            window.removeEventListener('mousemove', onDrag);
            
        }

        const onDragStart = (e) => {
            movement = { sx: e.pageX, sy: e.pageY, x:0, y:0 };
            this.ref('html').classList.add('dragging');
            window.addEventListener('mousemove', onDrag, false);
            window.addEventListener('mouseup', onDragStop, false);
        }

        this.canvas.addEventListener('mousedown', onDragStart, false);

    }

    onReady(){
        const self = this;

        const base64 = document.createElement("input");
        base64.type = "hidden";
        base64.name = "avatar_b64";
        this.appendChild(base64);

        this.base64 = base64;

        this.canvas = this.ref('preview-canvas');

        this.ref('html').classList.add('initial');

        this.ref('bg-input').addEventListener('input', function(e){
            self.previewStyle.backgroundColor = this.value;
            self.update();
        });

        this.ref('scale-input').addEventListener('input', function(e){
            self.graphicProperties.scale = this.value;
            self.update();
        });

        this.ref('text-color-input').addEventListener('input', function(e){
            self.previewStyle.color = this.value;
            self.update();
        });

        this.ref('graphic-color-input').addEventListener('input', function(e){
            self.graphicProperties.color = this.value;
            self.update();
        });

        this.ref('text-input').addEventListener('input', function(e){
          //  console.log(this.value);
          this.value = this.value.toUpperCase();
          if(this.value != ''){
            self.ref('html').classList.add('has-text');
          }else{
            self.ref('html').classList.remove('has-text');
          }

            if(this.value.length <= 2){
                self.previewStyle.fontSize = 85;
            }else{
                self.previewStyle.fontSize = 65;
            }

            self.previewStyle.text = this.value.toUpperCase();
            self.update();
        });

        this.ref('file-btn').addEventListener('files', function(e){
            self.ref('html').classList.remove('initial');
            self.ref('html').classList.add('image');
           
            const file = e.detail[0];
            console.log(file, e);
            AvatarGraphic.fromImage(file).then(( graphic  ) => {
                graphic.fitToBox( self.canvas.width, self.canvas.height );
                self.graphics[0] = graphic;
                graphic.type = 'import';
                self.update();
                self.ref('html').classList.add('has-image');
                return graphic;
            }).catch(console.error);
        }, false );

        const samples = this.root.querySelectorAll('.sample');

        for(let i=0;i<samples.length;i++){
            samples[i].addEventListener('click', function(e){
                const imgPath = this.getAttribute('data-path');
                AvatarGraphic.fromURL(imgPath).then(( graphic  ) => {
                    graphic.fitToBox( self.canvas.width, self.canvas.height );
                    self.graphics[0] = graphic;
                    self.update();
                    self.ref('html').classList.add('has-image');
                    return graphic;
                }).catch(console.error);
            }, false);
        }

        self.previewStyle.backgroundColor = this.ref('bg-input').value;
        self.previewStyle.color = this.ref('text-color-input').value;

        self.setup();
        this.update();

    }

    onPropertyChanged( prop, old, value ){
        const self = this;
        let unit;

        switch( prop ){
            case 'size':
            this.styles.replace({
                ':host': {
                    width: value+'px'
                }
            });
            break;
        }
    }
}

customElements.define( AvatarCreator.tag, AvatarCreator );