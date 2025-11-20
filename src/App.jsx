import './App.css'
import Nav from './Nav'
import Header from './Header'

function App() {
  return (
    <div className="app-container">
      <Header />
      <Nav />
      <main className="app-main">
        <div className="app-content">
          {/* Your main content goes here */}
        </div>
      </main>
    </div>
  )
}

export default App
