import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import PromptComponent from '../components/prompt/prompt.jsx';
import VM from 'scratch-vm';
import {SCRATCH_MAX_CLOUD_VARIABLES} from '../lib/tw-cloud-limits.js';
import {nameProblem, promptKind} from '../components/kishufiya-guide/name-ask.js';

class Prompt extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleOk',
            'handleScopeOptionSelection',
            'handleCancel',
            'handleChange',
            'handleKeyPress',
            'handleCloudVariableOptionChange',
            'setInput'
        ]);
        this.input = null;
        this.keepSelection = false;
        this.state = {
            isAddingCloudVariableScratchSafe: (
                props.vm &&
                props.vm.runtime.getNumberOfCloudVariables() < SCRATCH_MAX_CLOUD_VARIABLES
            ) || false,
            inputValue: '',
            nameError: '',
            globalSelected: true,
            cloudSelected: false,
            canAddCloudVariable: (props.vm && props.vm.runtime.canAddCloudVariable()) || false
        };
    }
    handleKeyPress (event) {
        if (event.key === 'Enter') this.handleOk();
    }
    handleFocus (event) {
        // after a wrong name the typing stays as it is, the cursor at its end (kishufiya decision 52)
        if (this.keepSelection) this.keepSelection = false;
        else event.target.select();
    }
    setInput (el) {
        this.input = el;
    }
    handleOk () {
        // כישופייה (decision 52): the guide asks for a name and this is another one - nothing is made, the window stays
        const typed = this.input ? this.input.value : this.state.inputValue;
        const problem = nameProblem(
            promptKind({varType: this.props.varType, showVariableOptions: this.props.showVariableOptions}), typed);
        if (problem) {
            this.setState({nameError: problem, inputValue: typed});
            if (this.input) {
                this.keepSelection = true;
                this.input.focus();
                const end = this.input.value.length;
                try {
                    this.input.setSelectionRange(end, end);
                } catch (e) { /* not a text box */ }
            }
            return;
        }
        this.props.onOk(this.state.inputValue, {
            scope: this.state.globalSelected ? 'global' : 'local',
            isCloud: this.state.cloudSelected
        });
    }
    handleCancel () {
        this.props.onCancel();
    }
    handleChange (e) {
        this.setState({inputValue: e.target.value, nameError: ''});
    }
    handleScopeOptionSelection (e) {
        this.setState({globalSelected: (e.target.value === 'global')});
    }
    handleCloudVariableOptionChange (e) {
        if (!this.props.showCloudOption) return;

        const checked = e.target.checked;
        this.setState({cloudSelected: checked});
        if (checked) {
            this.setState({globalSelected: true});
        }
    }
    render () {
        return (
            <PromptComponent
                isAddingCloudVariableScratchSafe={this.state.isAddingCloudVariableScratchSafe}
                canAddCloudVariable={this.state.canAddCloudVariable}
                cloudSelected={this.state.cloudSelected}
                defaultValue={this.props.defaultValue}
                inputRef={this.setInput}
                nameError={this.state.nameError}
                globalSelected={this.state.globalSelected}
                isStage={this.props.isStage}
                showListMessage={this.props.showListMessage}
                label={this.props.label}
                showCloudOption={this.props.showCloudOption}
                showVariableOptions={this.props.showVariableOptions}
                title={this.props.title}
                onCancel={this.handleCancel}
                onChange={this.handleChange}
                onCloudVarOptionChange={this.handleCloudVariableOptionChange}
                onFocus={this.handleFocus}
                onKeyPress={this.handleKeyPress}
                onOk={this.handleOk}
                onScopeOptionSelection={this.handleScopeOptionSelection}
            />
        );
    }
}

Prompt.propTypes = {
    defaultValue: PropTypes.string,
    isStage: PropTypes.bool.isRequired,
    showListMessage: PropTypes.bool.isRequired,
    label: PropTypes.string.isRequired,
    onCancel: PropTypes.func.isRequired,
    onOk: PropTypes.func.isRequired,
    showCloudOption: PropTypes.bool.isRequired,
    showVariableOptions: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    varType: PropTypes.string,
    vm: PropTypes.instanceOf(VM)
};

export default Prompt;
