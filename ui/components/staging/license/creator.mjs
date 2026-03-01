import Custom from "../../core/Dom/Custom.mjs";
import "./templates/templates.mjs";

class TemplateControl extends Custom.HTMLElement {

    static tag = 'template-control';

	config = null;

	static config = {
        properties: {
            width: { linked: true }
        }
    };

	params = {};

	static get style(){
        return [{
            ':host': {
                width: '100%',
                height: '100%'
            },
			'.component--html .fields': {
				height: 0,
				overflow: 'hidden'
			},
			'.component--html.included .fields': {
				height: 'auto',
				overflow: 'visible'
			},
			'::slotted(fieldset)': {
				marginBottom: '1.5rem !important'
			},
			'::slotted(.row)': {
				display: 'flex',
				flexDirection: 'row'
			},
			'.row > *': {
				width:'100%'
			}
        }];
    }

	static html(){
        return `
		<fieldset>
		<legend ref="label" >Control Group</legend>
		<form-checkbox ref="include" class="include-section" type="checkbox" name="include" value="true" label="Include" ></form-checkbox>
		<div class="fields">
		<slot></slot>
		</div>
		</fieldset>
		`;
	}

	onPropertyChanged( property, old, value ){

        switch(property){
            case 'width':

            break;
        }

    }

	buildInput( key, params, container ){
		const { type } = params;

		let multiple;
		if(params.multiple){
			multiple = true;
			delete params.multiple
		}
	
		this.params[key] = params;
		delete params.type;

		let input, listener;

		const row = document.createElement('div');
		row.className = 'row';

		switch(type){
			case 'fieldset':
				const fieldset = document.createElement('fieldset');
				const legend =document.createElement('legend');
				legend.innerText = params.label;
				fieldset.appendChild(legend);
				delete params.label;
				for(let child in params){
					this.buildInput(child, params[child], fieldset );
				}
				this.appendChild(fieldset);
				return;
			break;
			case 'range':
			
				input = document.createElement('form-range');
				listener = '';
				for(let attr in params ){
					input[attr] = params[attr];
				}
				
				input.addEventListener('input', (e) => {
					this.params[key].value = input.value;
					this.target.control( key, input.value);
				});
				

			break;
			case 'token':
				input = document.createElement('input-token');
				input.value = params.value;
				input.addEventListener('change', (e) => {
					this.params[key].value = input.value;
					this.target.control( key, input.value);
				});
			break;
			case 'border':
				input = document.createElement('input-border');
				for(let attr in params ){
					input[attr] = params[attr];
				}
				input.addEventListener('change', (e) => {
					this.params[key].value = input.value;
					this.target.control( key, input.value);
				});
		}

		row.appendChild(input);

		(container || this ).appendChild(row);

		
		if(multiple){
			const multi = document.createElement('a');
			multi.innerHTML = "+";
			multi.className = 'button add-row flex-static';

			multi.addEventListener('click', function(){

			});
			row.appendChild(multi);
		}

		this.params[key].value = input.value;
	//	if(this.included){
			
			this.target.control( key, input.value);
	//	}
	
	}

	build(){
		this.ref('label').innerHTML = this.config.label || 'undefined';
		for(let input in this.config.inputs ){
			const params = this.config.inputs[input];
			this.buildInput(input, params);
		}
	}

	onReady(){
		debug('Ring Control Ready');
		if(this.hasAttribute('for')){
			this.target = document.getElementById( this.getAttribute('for') );
			
			this.config = this.target.getControlConfig(this);
			debug(this.config);
			this.build();
		} 

		this.ref('include').addEventListener('click', () => {
			const inc = this.ref('include').checked;
			this.included = inc;
			this.target.control( 'include', inc );
			this.ref('html').classList[inc ? 'add' : 'remove']('included');

			if(inc){
				for(let key in this.params){
					this.target.control( key, this.params[key] );
				}
			}
		});
	}

	

}

customElements.define('template-control', TemplateControl);

class LicenseCreator extends Custom.HTMLElement {

    static tag = 'license-creator-x';

    static config = {
        properties: {
            
        }
    };

    static get style(){
        return [];
    }

    static html(){
        return `
        
        `;
    }
    
    constructor(){

    }


}

customElements.define( LicenseCreator.tag, LicenseCreator );

