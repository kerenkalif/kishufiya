// כישופייה: "המשחקים שלי" inside the editor, like Scratch's "My Stuff" (2026-10-23). The child's games
// come from the platform; opening one, or starting a new one, asks the page around the editor to go
// there - it saves the open game first (useKishufiya on the platform).
import PropTypes from 'prop-types';
import React from 'react';
import Modal from '../../containers/modal.jsx';
import styles from './my-games.css';

const formatDate = iso => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

class MyGames extends React.Component {
    constructor (props) {
        super(props);
        this.state = {games: null, failed: false, sure: null, busy: false};
        this.handleNew = this.handleNew.bind(this);
    }
    componentDidMount () {
        fetch('/api/kishufiya/games', {credentials: 'same-origin'})
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then(body => this.setState({games: body.games}), () => this.setState({failed: true}));
    }
    handleNew () {
        this.setState({busy: true});
        fetch('/api/kishufiya/game', {method: 'POST', credentials: 'same-origin'})
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then(
                body => this.props.onOpen(`/my/games/${body.id}`),
                () => this.setState({busy: false, failed: true})
            );
    }
    handleDelete (game) {
        fetch(`/api/kishufiya/game/${game.id}`, {method: 'DELETE', credentials: 'same-origin'})
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                this.setState(state => ({games: state.games.filter(g => g.id !== game.id), sure: null}));
            })
            .catch(() => this.setState({sure: null, failed: true}));
    }
    renderCard (game) {
        const current = game.id === this.props.currentId;
        return (
            <li
                key={game.id}
                className={current ? styles.current : styles.card}
            >
                <button
                    className={styles.open}
                    onClick={() => (current ? this.props.onClose() : this.props.onOpen(game.href))} // eslint-disable-line react/jsx-no-bind
                >
                    <span className={styles.picture}>
                        {game.hasThumbnail ? (
                            <img
                                src={`/api/kishufiya/game/${game.id}/thumb?v=${game.updatedAt}`}
                                alt=""
                                loading="lazy"
                            />
                        ) : <span className={styles.wand}>{'🪄'}</span>}
                    </span>
                    <span className={styles.title}>{game.title}</span>
                    <span className={styles.meta}>
                        {game.lesson ? 'משחק משיעור' : 'משחק שלי'}
                        {' · '}
                        {formatDate(game.updatedAt)}
                        {current ? ' · פתוח עכשיו' : ''}
                    </span>
                </button>
                {!game.lesson && !current && (this.state.sure === game.id ? (
                    <span className={styles.confirm}>
                        <button
                            className={styles.yes}
                            onClick={() => this.handleDelete(game)} // eslint-disable-line react/jsx-no-bind
                        >{'כן, למחוק'}</button>
                        <button
                            className={styles.no}
                            onClick={() => this.setState({sure: null})} // eslint-disable-line react/jsx-no-bind
                        >{'לא'}</button>
                    </span>
                ) : (
                    <button
                        className={styles.remove}
                        onClick={() => this.setState({sure: game.id})} // eslint-disable-line react/jsx-no-bind
                    >{'מחיקה'}</button>
                ))}
            </li>
        );
    }
    render () {
        const {games, failed, busy} = this.state;
        return (
            <Modal
                fullScreen
                id="kishufiyaMyGames"
                contentLabel="המשחקים שלי"
                onRequestClose={this.props.onClose}
            >
                <div
                    className={styles.body}
                    dir="rtl"
                >
                    <div className={styles.top}>
                        <button
                            className={styles.newGame}
                            disabled={busy}
                            onClick={this.handleNew}
                        >
                            {'🪄 משחק חדש'}
                        </button>
                        {failed && <span className={styles.error}>{'משהו לא הצליח. נסו שוב.'}</span>}
                    </div>
                    {games === null && !failed && <p className={styles.note}>{'טוענים…'}</p>}
                    {games && games.length === 0 && (
                        <p className={styles.note}>{'עוד אין לכם משחקים. פתחו שיעור, או לחצו על "משחק חדש".'}</p>
                    )}
                    {games && games.length > 0 && (
                        <ul className={styles.grid}>
                            {games.map(game => this.renderCard(game))}
                        </ul>
                    )}
                </div>
            </Modal>
        );
    }
}

MyGames.propTypes = {
    currentId: PropTypes.string, // the game open in the editor now
    onClose: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired // (href) the page goes there, after saving the open game
};

export default MyGames;
