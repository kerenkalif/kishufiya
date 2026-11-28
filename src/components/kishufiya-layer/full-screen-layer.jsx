import PropTypes from 'prop-types';
import {useEffect} from 'react';
import {registerLayer} from '../../lib/kishufiya-showing.js';

// Every full-screen layer that REPLACES the editor (not a dialog of working on this game) is rendered inside this:
// while it is mounted the lesson is told the editor shows something that is not its game (kishufiya-showing.js).
const FullScreenLayer = ({children}) => {
    useEffect(() => registerLayer(), []);
    return children;
};

FullScreenLayer.propTypes = {
    children: PropTypes.node
};

export default FullScreenLayer;
