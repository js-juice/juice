import Custom from "../../../core/Dom/Custom.mjs";

class TemplateBase extends Custom.HTMLElement {


    bounds = {};

    params = { };

    static config = {
        properties: {
            label: { linked: true, default: 'Template Label' },
        }
    };


    static get observed(){
		return {
			attributes: ['label', ...(this.observerdAttributes || [])],
			properties: ['label', ...(this.observerdProperties || [])]
		}
    }

    static get style(){
        return [];
    }

    static html(){
        return `
        <svg ref="svg" viewBox="0 0 500 500" >

        </svg>
        `;
    }

    get controlConfig(){
        return {
            label: this.label,
            inputs: this.constructor.inputs,
        }
    }

    getControlConfig(controls){
        this.controls = controls;
        return this.controlConfig;
    }

    static get inputs(){
        return {
			text: {
				type: 'fieldset',
				label: "Text Tokens",
				token: {
					type: 'token',
					multiple: true
				},
			},
			border: {
				type: 'fieldset',
				label: "Borders",
				outerBorder: {
					type: 'border',
					label: 'Outer Border Style'
				}
			}
		}
    }

    

    control( key, value ){
        const controlParams = this.controls.params;
        if(value === undefined) return;

    }
}


export default TemplateBase;
