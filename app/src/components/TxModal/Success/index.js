import styles from './styles.module.scss'
import { ReactComponent as ConfettiLeft } from '../../../data/icons/confetti-left.svg'
import { ReactComponent as ConfettiRight } from '../../../data/icons/confetti-right.svg'
import AddTokens from '../../AddTokens'

const Success = ({ setModalOpen, canAddToken, setTokenAreaOpen }) => {
  const updateModalAndArea = () => {
    if (setTokenAreaOpen && typeof setTokenAreaOpen === 'function') {
      setTokenAreaOpen(false)
    }
    setModalOpen(false)
  }
  return (
    <div className={styles.promoMessage}>
      <span className={styles.prizeAmount}>{`Congratulations`}</span>
      <p>{`Your transaction completed succesfully.`}</p>
      {canAddToken && (<AddTokens onFurtherClick={updateModalAndArea} />)}
      <button
        className={styles.keepGoing}
        onClick={() => {
          updateModalAndArea()
        }}
      >
        See Your Tokens!
      </button>
      <ConfettiLeft className={styles.confettiLeft} />
      <ConfettiRight className={styles.confettiRight} />
    </div>
  )
}

export default Success
