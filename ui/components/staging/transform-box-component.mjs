import Custom from "../core/Dom/Custom.mjs";

class TransformBoxComponent extends Custom.HTMLElement {
    static tag = "transform-box";

    static config = {
        shadow: true,
        emitter: true,
        properties: {
            width: { type: 'number', linked: true },
            height: { type: 'number', linked: true },
            x: { type: 'number', linked: true },
            y: { type: 'number', linked: true },
            rotation: { type: 'number', linked: true, default: 0 },
            scale: { type: 'number', linked: true, default: 1 },
        }
    };

    position = {x: 0, y: 0};

    static get observed(){
        return {
            attributes: ['width', 'height', 'rotation', 'scale'],
            properties: ['width', 'height', 'rotation', 'scale'],
        }
    }

    static get style() {
        return [{
            ':host': {
                position: 'absolute',
                display: 'inline-block',
                width:  '1px',
                height: '1px',
                cursor: 'grab'
            },
            ':host:active': {

            },
            '.anchor': {
                height: '10px',
                width: '10px',
                position: 'absolute',
                zIndex: 500,
                border: '1px solid var(--color-red)',
                borderRadius: '50%',
                transform: 'translate(-50%,-50%)'
            },
            '.anchor:before': {
                content: `""`,
                display: 'block',
                position: 'absolute',
                width: '1px',
                height: '30px',
                background: 'var(--color-red)',
                left:'50%',
                top: '50%',
                transform: 'translate( -50%, -50% )'
            },
            '.anchor:after': {
                content: `""`,
                display: 'block',
                position: 'absolute',
                height: '1px',
                width: '30px',
                background: 'var(--color-red)',
                left:'50%',
                top: '50%',
                transform: 'translate( -50%, -50% )'
            },
            '.component--html': {
                position: 'absolute',
                transform: 'translate( -50%, -50% )',
                width: 'auto',
                height: 'auto',
                background: 'rgba(255,255,255,0.5)',
            },
            'slot':{
                position: 'relative',
                display: 'block',
                zIndex: 10
            },
            '.container': {
                margin: '-5px',
                position: 'relative'
            },
            '.background': {
                width: 'calc(100% - 10px)',
                height: 'calc(100% - 10px)',
                position: 'absolute',
                top: '5px',
                left: '5px',
                
            },
            '.background svg': {
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            },
            '.corner': {
                position: 'absolute',
                width: '10px',
                height: '10px',
                background: '#3498eb',
                boxSizing: 'border-box',
                border: '1px solid var(--color-dark-gray)',
                cursor: 'nwse-resize',
                zIndex: 600
            },
            '.corner:hover': {
                background: 'var(--color-red)',
            },
            '.corner .inner': {
                opacity:0,
                cursor: 'none',
                transformOrigin: 'center',
            },
            '.corner .inner:hover, .corner .inner.target': {
                opacity:1
            },
            '.corner.top': {
                top: '-2.5px'
            },
            '.corner.bottom': {
                bottom: '-2.5px'
            },
            '.corner.left': {
                left: '-2.5px'
            },
            '.corner.right': {
                right: '-2.5px'

            },
            '.corner.top .inner': {
                bottom: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left'
            },
            '.corner.bottom .inner': {
                top: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left'
            },
            '.corner.left .inner': {
                right: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left'
            },
            '.corner.right .inner': {
                left: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left'
                
            },

            '.corner.top.right .inner': {
                transform: 'rotate(90deg)'
            },

            '.corner.bottom.right .inner': {
                transform: 'rotate(180deg)'
            },

            '.corner.bottom.left .inner': {
                transform: 'rotate(270deg)'
            },
            
            '.handel': {
                position: 'absolute',
                width: '10px',
                height: '10px',
                border: '1px solid var(--color-dark-gray)',
                background: 'var(--color-gray)',
                boxSizing: 'border-box',
                
            },
            '.handel .inner': {
                cursor: 'none',
                transformOrigin: 'center',
                opacity: 0
            },
            '.handel .inner:hover, .handel .inner.target': {
                opacity: 1
            },
            '.handel.top': {
                top: '-4px',
                left: 'calc( 50% - 4px )',
                cursor: 'ns-resize',
                
            },
            '.handel.top .inner': {
                bottom: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left',
                transform: 'translateX(-25%) rotate(45deg)'
            },
            '.handel.bottom': {
                bottom: '-4px',
                left: 'calc( 50% - 4px )',
                cursor: 'ns-resize',
            },
            '.handel.bottom .inner': {
                top: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left',
                transform: 'translateX(-25%) rotate(-135deg)'
            },
            '.handel.left': {
                left: '-4px',
                top: 'calc( 50% - 4px )',
                cursor: 'ew-resize',
            },
            '.handel.left .inner': {
                right: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left',
                transform: 'translateY(-25%) rotate(-45deg)'
            },
            '.handel.right': {
                right: '-4px',
                top: 'calc( 50% - 4px )',
                cursor: 'ew-resize',
                
            },
            '.handel.right .inner': {
                left: '100%',
                background: 'url(/img/cursors/rotate.svg) no-repeat top left',
                transform: 'translateY(-25%) rotate(135deg)'
            },
            '.handel .inner, .corner .inner': {
                width: '20px',
                height: '20px',
                position: 'absolute'
            },
            '.rotation': {
                position: 'absolute',
                transformOrigin: 'center center',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            },
            '.scale': {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transformOrigin: 'center center',
                transform: 'translate( -50%, -50% )',
                width: '100%',
                height: '100%',
                position: 'absolute',
            },
            '.actions':{
                position: 'absolute',
                top: 'calc( 100% - 8px)',
                left: '10px',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                background: 'var(--color-dark-gray)',
            },
            '.actions .action':{
                display:'flex',
                width: '36px',
                height: '36px',
                padding: '3px',
                flex: '0 0 auto',
                color: '#FFF',
                borderRight: '1px solid var(--color-lt-gray)',
                alignItems: 'center',
                justifyContent: 'center',
                cursor:'pointer'
            },
            '.asset': {
                width: '100%',
                height: '100%',
                position: 'absolute',
                zIndex: 500,
                top: 0,
                left:0
            },
            'svg polygon': {
                animation: 'dash 60s linear infinite',
                animationDirection: 'reverse',
                strokeDasharray: 5,
            },
            ':host(.active) svg polygon': {
                animation: 'dash 40s linear infinite',
                
            }
        }, `
        *{
            box-sizing: border-box;
        }
        
        @-webkit-keyframes dash {
            to {
            stroke-dashoffset: 1000;
            }
        }

        `];
    }

    strokeWidth = 2;
    cornerColor = '#3498eb';

    static html() {
        const svgMargin = this.strokeWidth/2;
        const svgWidth = this.width - this.strokeWidth;
        const svgHeight = this.height - this.strokeWidth;
        return `
                
        
            <div class="rotation" ref="rotation" style="transform:rotate(${this.rotation}deg);">
                <div class="background">
                    <svg class="fill" viewBox="0 0 ${this.width} ${this.height}">
                    <polygon
                    class="path"
                    points="${svgMargin} ${svgMargin}, ${this.width/2} ${svgMargin}, ${this.width/2} ${svgMargin}, ${svgWidth} ${svgMargin}, ${svgWidth} ${svgHeight}, ${svgMargin} ${svgHeight}, ${svgMargin} ${this.height/2}, ${svgMargin} ${this.height/2}, ${svgMargin} ${this.height/2}" 
                    stroke="var(--color-gray-blue)"
                    stroke-width="${this.strokeWidth}"
                    fill="none" 
                    fill-rule="evenodd"
                           />
                    
                    </svg>
                    <div class="corner resize top left" ref="corner-tl"><div class="inner"></div></div>
                    <div class="corner resize top right" ref="corner-tr"><div class="inner"></div></div>
                    <div class="corner resize bottom left" ref="corner-bl"><div class="inner"></div></div>
                    <div class="corner resize bottom right" ref="corner-br"><div class="inner"></div></div>
                    <div class="handel resize top" ref="handel-t"><div class="inner"></div></div>
                    <div class="handel resize bottom" ref="handel-b" ><div class="inner"></div></div>
                    <div class="handel resize left" ref="handel-l" ><div class="inner"></div></div>
                    <div class="handel resize right" ref="handel-r" ><div class="inner"></div></div>
                </div>
            
                <div class="scale" ref="scale">
                    <div class="asset" ref="asset">
                    <slot style="width: ${this.width-20}px;height: ${this.height-20}px;left:10px;top:10px;" ></slot>
                    </div>
                </div>
                
            </div>
            <div class="actions">
            <a class="action" ref="action-save" title="Save Annotation" event="click::saveAsset" >
                <m-icon type="save"  size="25"></m-icon>
            </a>
            <a class="action" ref="action-delete" title="Delete Annotation" event="click::deleteAsset"  >
                <m-icon type="delete" size="20"></m-icon>
            </a>
        </div>
        `;

    }

    saveAsset(e){
        e.stopPropagation();
        e.preventDefault();

        const detail = {
            id: this.id,
            name: this.name,
            rotation: this.rotation,
            scale: this.scale,
            position: this.position,
        };



        this.dispatchEvent(new CustomEvent('save', { detail: detail }));
    }

    deleteAsset(e){
        e.stopPropagation();
        e.preventDefault();
       
        this.dispatchEvent(new CustomEvent('delete', { detail: id }));
    }

    set x(value){
        this.position.x = value;
        this.styles.replace({
            ':host': {
                left: `${this.position.x}px`,
                top: `${this.position.y}px`
            }
        }, 'position');
    }

    get x(){
        return this.position.x;
    }

    get y(){
        return this.position.y;
    }

    set y(value){
        this.position.y = value;
        this.styles.replace({
            ':host': {
                left: `${this.position.x}px`,
                top: `${this.position.y}px`
            }
        }, 'position');
    }

   

    dragAction(e){   
        debug('Move Drag', this.dragType);
        e.preventDefault();
        
        this.dragPosition = {
            x: e.clientX,
            y: e.clientY
        };
    }

    stopDragAction(e){

        e.preventDefault();
        this.dragging = false;
        this.releasePointerCapture(e.pointerId);

        this.ref('html').classList.remove(`drag-${this.dragType}`);
        this.dragType = null;

        window.removeEventListener('pointerup', this.stopDragAction );
        window.removeEventListener('pointermove', this.dragAction );
        this.ref('asset').addEventListener('pointerdown', this.startDragAction, false );
    }

    distanceToAnchor( x, y ){
        const ax = x - this.x;
        const ay = y - this.y;
        debug(ax, ay);
        return Math.sqrt( ax * ax + ay * ay );
    }

    startDragAction(e){

        e.preventDefault();
        e.stopPropagation();
        if(this.dragging) return false;
        this.dragging = true;

        const self = this;
        this.setPointerCapture(e.pointerId);
        this.removeEventListener('pointerdown', this.onGrab );
        const target = e.target;
        target.classList.add('target');

        if(this.dragType)
        this.ref('html').classList.remove(`drag-${this.dragType}`);

        this.dragType = e.target.classList.contains('inner') ? 'rotate' : (e.target.classList.contains('resize') ? 'resize' : 'move'    );
        this.dragging = true;
        this.ref('html').classList.add(`drag-${this.dragType}`);

        const start = {
            x: e.clientX,
            y: e.clientY
        };

        this.dragPosition = { ...start };
        this.lastDragPosition = { ...start };

        let positionX = this.x;
        let positionY = this.y;


        if(self.dragType == 'resize'){
            start.distanceToAnchor = this.distanceToAnchor(start.x, start.y);
            start.scale = this.scale;
        }else if(self.dragType == 'rotate'){
            const sx = start.x - positionX;
            const sy = start.y - positionY;
            var stheta = Math.atan2(sx, sy);
            start.angle = (stheta *= 180 / Math.PI)+90; // rads to degs, range (-180, 180]
            start.rotation = self.rotation;
        }

        function dragTick(){
            //Get Delta between last tick and this tick
            const currentX = self.dragPosition.x;
            const currentY = self.dragPosition.y;
            const lastX = self.lastDragPosition.x;
            const lastY = self.lastDragPosition.y;

            const delta = { x: lastX - currentX, y: lastY - currentY  };
            const total = { x: start.x - currentX, y: start.y - currentY };

            let totalDistance = Math.sqrt(total.x * total.x + total.y * total.y);
            
            //Distance to Anchor
            const mx = positionY - self.dragPosition.x;
            const my = positionX - self.dragPosition.y;
            const updates = { };

           // if(self.dragStart.x > self.dragPosition.x) totalDistance *= -1;
           // debug(totalDistance, mx, my );
            switch(self.dragType){
                case 'rotate':
                var theta = Math.atan2(my, mx);
                const angle = theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
                
                updates.rotation = start.rotation + (start.angle + angle);
                
                break;
                case 'resize':
                const distanceToAnchor = self.distanceToAnchor(currentX, currentY);
                debug(currentX, currentY, start.distanceToAnchor, distanceToAnchor, (distanceToAnchor/start.distanceToAnchor));
                updates.scale = (distanceToAnchor/start.distanceToAnchor) * start.scale;


                self.scale = updates.scale;
                
                break;
                case 'move':
                positionY -= delta.y;
                positionX -= delta.x;
                updates.position = { x: positionX, y: positionY };
                break;

            }

            self.lastDragPosition = { ...self.dragPosition };
            self.draw(updates);

            if(self.dragging){
                window.requestAnimationFrame(dragTick);
            }else{
                target.classList.remove('target');
                self.lastDragPosition = null;
            }
        }

        window.requestAnimationFrame(dragTick);

        this.stopDragAction = this.stopDragAction.bind(this);
        this.dragAction = this.dragAction.bind(this);
    
        window.addEventListener('pointermove', this.dragAction);
        window.addEventListener('pointerup', this.stopDragAction);
    }

    draw( updates ){

       // debug(updates);
        if(updates.rotation){
            this.rotation = updates.rotation;
            this.ref('rotation').style.transform = `rotate(${this.rotation}deg)`;
        }

        if(updates.scale){
            this.scale = updates.scale;
            this.ref('html').style.width = `${(this.width*this.scale)+20}px`;
            this.ref('html').style.height = `${(this.height*this.scale)+20}px`;
            this.ref('scale').style.transform = `translate(-50%, -50%) scale(${this.scale})`;
        }

        if(updates.position){
            this.x = updates.position.x;
            this.y = updates.position.y;
        }
    }

    onPropertyChanged(name, old, value){
        switch(name){
            case 'width':
            this.ref('html').style.width = this.ref('scale').style.width = `${value+20}px`;
            this.render();
            break;
            case 'height':
            this.ref('html').style.height = this.ref('scale').style.height = `${value+20}px`;
            this.render();
            break;
        }
    }

    onReady(){
        this.asset = this.children[0];
        this.width = (this.width || this.asset.width)+20;
        this.height = (this.height || this.asset.height)+20;
        debug(this.asset);
        const assetRect = this.asset.getBoundingClientRect();
        debug(assetRect);
       // this.ref('html').style.width = `${assetRect.width}px`;
       // this.ref('html').style.height = `${assetRect.height}px`;
       // this.render();

        this.startDragAction = this.startDragAction.bind(this);

        ['corner-tl', 'corner-tr', 'corner-bl', 'corner-br', 'handel-t', 'handel-b', 'handel-l', 'handel-r'].forEach((square) => {
            this.ref(square).addEventListener('pointerdown', this.startDragAction, false );
            this.ref(square).firstChild.addEventListener('pointerdown', this.startDragAction, false );
        });

        this.ref('html').insertAdjacentHTML('beforebegin','<div class="anchor"></div>');

        this.ref('asset').addEventListener('pointerdown', this.startDragAction, false );

 
    }
}

customElements.define(TransformBoxComponent.tag, TransformBoxComponent);