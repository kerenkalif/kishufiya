import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import styles from './delete-button.css';
import deleteIcon from './icon--delete.svg';

// Reuses the sound editor's translated 'Delete' so the button has a Hebrew accessible name.
const messages = defineMessages({
    delete: {
        id: 'gui.soundEditor.delete',
        description: 'Title of the button to delete the sound',
        defaultMessage: 'Delete'
    }
});

const DeleteButton = props => (
    <div
        aria-label={props.intl.formatMessage(messages.delete)}
        className={classNames(
            styles.deleteButton,
            props.className
        )}
        role="button"
        tabIndex={props.tabIndex}
        onClick={props.onClick}
    >
        <div className={styles.deleteButtonVisible}>
            <img
                alt=""
                className={styles.deleteIcon}
                src={deleteIcon}
                draggable={false}
            />
        </div>
    </div>

);

DeleteButton.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    onClick: PropTypes.func.isRequired,
    tabIndex: PropTypes.number
};

DeleteButton.defaultProps = {
    tabIndex: 0
};

export default injectIntl(DeleteButton);
