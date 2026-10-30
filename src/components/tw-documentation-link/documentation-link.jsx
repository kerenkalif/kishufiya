import React from 'react';
import PropTypes from 'prop-types';

// TurboWarp disconnect (platform SPEC-scratch-independence 7): the "Learn more" links pointed at
// the documentation site of TurboWarp, an outside service, and no page of ours fits them, so nothing is shown.
// eslint-disable-next-line no-unused-vars
const DocumentationLink = ({slug, children}) => null;
DocumentationLink.propTypes = {
    slug: PropTypes.string,
    children: PropTypes.node
};

export default DocumentationLink;
