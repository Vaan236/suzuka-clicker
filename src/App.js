import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import db from './firebaseConfig';
import { collection, addDoc, getDocs, orderBy, query, limit, deleteDoc } from 'firebase/firestore';
import { supabase } from './supabaseClient';
import ReCAPTCHA from 'react-google-recaptcha';
import githubPng from './assets/github.png';
import xPng from './assets/X.png';

function App() {
  const [clickCount, setClickCount] = useState(0)
  const [comments, setComments] =useState([""])
  const [newComment, setNewComment] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false); //Cooldown state
  const [cooldownMessage, setCooldownMessage] = useState(""); // Cooldown message
  const [showRecaptcha, setShowRecaptcha] = useState(false); // Lazy load reCAPTCHA
  const commentContainerRef = useRef(null); // Ref for the comment container
  const previousScrollPosition = useRef(0); // Ref to store the previous scroll position
  const isAddingComment = useRef(false); // Flag to track if a comment is being added

  // Simple client-side blacklist for rude words (case-insensitive).
  const forbiddenWords = [
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'piss', 'cunt', 'nigger', 'motherfucker', 'nigga'
  ];

  // helper to escape strings for regex
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // get comments
  const fetchComments = async () => {
    const commentRef = collection(db, "comments");
    const q = query(commentRef, orderBy("timestamp", "desc"), limit(30));

    const querySnapshot = await getDocs(q);
    const fetchedComments = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000; // Check if older than 1 hour

            if (isExpired) {
                // Delete expired comments
                await deleteDoc(doc.ref);
                return null;
            }

            return {
                id: doc.id,
                ...data,
            };
        })
    );

    setComments(fetchedComments.filter(Boolean)); // Remove null values
  };

  // Clear comments state on refresh
  useEffect(() => {
    setComments([]); // Clear comments state to prevent duplicates
    fetchComments();
  }, []);


  const handleCaptchaChange = (value) => {
    if (value) {
      setCaptchaVerified(true); //CAPTCHA verified
    } else {
      setCaptchaVerified(false); //CAPTCH not verified
    }
  };

  // handle comment section
  const handleAddComment = async () => {
    const maxCharacters = 50; // Maximum character limit

    if (!captchaVerified) {
      alert("Please complete the CAPTCHA verification.");
      return;
    }

    if (newComment.trim().length < 2) {
      alert("Your comment must be at least 2 characters long.");
      return;
    }

    if (newComment.length > maxCharacters) {
      alert(`Your comment exceeds the maximum character limit of ${maxCharacters} characters.`);
      return;
    }

    // Check for forbidden words (simple word-boundary match)
    const lower = newComment.toLowerCase();
    const foundBad = forbiddenWords.find((w) => {
      const re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'i');
      return re.test(lower);
    });

    if (foundBad) {
      alert('Please keep comments friendly and avoid profanity or personal attacks.');
      return;
    }

    // Store the current scroll position before any state changes
    previousScrollPosition.current = commentContainerRef.current?.scrollTop || 0;
    isAddingComment.current = true;

    try {
      const randomId = Math.floor(Math.random() * 10000);
      const newCommentData = {
        text: newComment,
        username: `Anonymous${randomId}`,
        timestamp: Date.now(),
      };

      // Add the comment to Firestore
      await addDoc(collection(db, "comments"), newCommentData);

      // Update local state with the new comment
      setComments((prevComments) => {
        const updatedComments = [newCommentData, ...prevComments];
        return updatedComments.slice(0, 30); // Limit to 30 comments
      });

      // Clear the input field and reset CAPTCHA
      setNewComment("");
      setCaptchaVerified(false);

      // Set up cooldown
      setCooldownActive(true);
      const cooldownDuration = 10 * 60 * 1000;
      const cooldownEndTime = Date.now() + cooldownDuration;
      localStorage.setItem("cooldownEndTime", cooldownEndTime);

      let cooldownTime = cooldownDuration / 1000;
      const interval = setInterval(() => {
        cooldownTime -= 1;
        const remainingMinutes = Math.floor(cooldownTime / 60);
        const remainingSeconds = Math.floor(cooldownTime % 60);
        setCooldownMessage(`Please wait ${remainingMinutes} minutes and ${remainingSeconds} seconds...`);
        if (cooldownTime <= 0) {
          clearInterval(interval);
          setCooldownActive(false);
          setCooldownMessage("");
          localStorage.removeItem("cooldownEndTime");
        }
      }, 1000);
    } catch (error) {
      console.error("Error adding comment:", error);
      isAddingComment.current = false; // Reset flag on error
    }
  };

  //updates total clicks when the app loads

  useEffect(() => {
    // Fetch click count from Supabase
    const fetchTotalClicks = async () => {
      const { data, error } = await supabase
        .from('clicks')
        .select('count, id')
        .maybeSingle();
      if (error) {
        console.error('Error fetching total clicks:', error);
        return;
      }
      if (data && typeof data.count === 'number') {
        setClickCount(data.count);
      }
    };
    fetchTotalClicks();
    const interval = setInterval(fetchTotalClicks, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleClick() { 
    const audio = new Audio(process.env.PUBLIC_URL + '/suzuka.mp3');
    audio.volume = 0.2;
    audio.play();

  // Array of Suzuka image URLs
  const suzukaImages = [
    '/suzuka1.png'
  ];

  // Select a random image
  const randomImage = suzukaImages[Math.floor(Math.random() * suzukaImages.length)];


  // Declare suzukaImage before using it
  const suzukaImage = document.createElement('img');
  suzukaImage.src = randomImage; // Set the random image
  suzukaImage.alt = 'Silence Suzuka';
  suzukaImage.className = 'suzuka-image';

  // Adjust positions based on screen size
  const isMobile = window.innerWidth <= 768;
  const positions = isMobile ? [300] : [250]; // Different positions for mobile
  suzukaImage.style.top = `${positions[Math.floor(Math.random() * positions.length)]}px`;

  suzukaImage.style.left = '-100px'; // Anchor to left edge, fully offscreen (image is 150px wide)
  suzukaImage.style.transform = 'translateX(0)'; // Start at the left edge

  document.body.appendChild(suzukaImage);

  // Force reflow to ensure the initial transform is applied
  void suzukaImage.offsetWidth;

  // Animate to the right using viewport width for mobile safety
  suzukaImage.style.transform = 'translateX(calc(100vw + 100px))';

    const screenSize = detectScreenSize(); //detects whats the screen of user
    const removalDelay = screenSize === "small" ? 850 : screenSize === "medium" ? 1200 : 1800;
    setTimeout(() => {
      suzukaImage.remove();
    }, removalDelay); // Match the animation duration


    // Increment click count in Supabase
    const incrementClick = async () => {
      // Get the current row (should only be one row in 'clicks')
      const { data, error } = await supabase
        .from('clicks')
        .select('count, id')
        .maybeSingle();
      if (error || !data) {
        console.error('Error fetching click count:', error);
        return;
      }
      const newCount = (data.count || 0) + 1;
      // Update the count
      const { error: updateError } = await supabase
        .from('clicks')
        .update({ count: newCount })
        .eq('id', data.id);
      if (updateError) {
        console.error('Error updating click count:', updateError);
        return;
      }
      setClickCount(newCount);
    };
    incrementClick();
  }

    const concerts = [
    {
      name: 'Silent Star',
      image: 'https://i.ytimg.com/vi/phdIVHuuXEo/maxresdefault.jpg',
      youtubeLink: 'https://youtu.be/FuKPzkNr0uY?si=lbvUEL3jPoht-FW6',
    },
    {
      name: 'Nanairo no Keshiki',
      image: 'https://i.ytimg.com/vi/y060pz2ziqE/maxresdefault.jpg',
      youtubeLink: 'https://youtu.be/2dGbm1PjRiQ?si=KpsXvLOTG_YDg59f',
    },
    {
      name: 'Fanfare for Future!',
      image: 'https://i.ytimg.com/vi/kYVGisJivMI/hq720.jpg?sqp=-oaymwE7CK4FEIIDSFryq4qpAy0IARUAAAAAGAElAADIQj0AgKJD8AEB-AH-CYAC0AWKAgwIABABGH8gQSg3MA8=&rs=AOn4CLAgSgYZ4qevS7xJ95A1G-ATn-QIyw',
      youtubeLink: 'https://youtu.be/0xlAFVz7_H8?si=ck8UYZFiixBHQxEu',
    },
  ];

  function detectScreenSize() {
    const screenWidth = window.innerWidth;

    if (screenWidth <= 480) {
      console.log("Small screen detected (mobile).");
      return "small";
    } else if (screenWidth <= 768) {
      console.log("Medium screen detected (tablet).");
      return "medium";
    } else {
      console.log("Large screen detected (desktop).");
      return "large";
    }
  }

  const Comment = ({ username, text, timestamp }) => {
    return (
        <div className="comment-item">
            <div className="comment-meta">
                <strong>{username}:</strong>
                <small>{new Date(timestamp).toLocaleString()}</small>
            </div>
            <div className="comment-text">{text}</div>
        </div>
    );
};

  // Restore scroll position after adding a comment
  useEffect(() => {
    if (isAddingComment.current && commentContainerRef.current) {
      const scrollPos = previousScrollPosition.current;
      commentContainerRef.current.scrollTop = scrollPos;
      
      requestAnimationFrame(() => {
        if (commentContainerRef.current) {
          commentContainerRef.current.scrollTop = scrollPos;
          setTimeout(() => {
            if (commentContainerRef.current) {
              commentContainerRef.current.scrollTop = scrollPos;
              isAddingComment.current = false;
            }
          }, 100);
        }
      });
    }
  }, [comments]);  // Adjust cooldown timer logic to prevent interference with scroll behavior
  useEffect(() => {
    const storedCooldownEndTime = localStorage.getItem("cooldownEndTime");
    if (storedCooldownEndTime) {
        const timeRemaining = storedCooldownEndTime - Date.now();
        if (timeRemaining > 0) {
            setCooldownActive(true);
            let cooldownTime = timeRemaining / 1000; // Convert to seconds
            const interval = setInterval(() => {
                cooldownTime -= 1;
                const remainingMinutes = Math.floor(cooldownTime / 60);
                const remainingSeconds = Math.floor(cooldownTime % 60);
                setCooldownMessage(`Please wait ${remainingMinutes} minutes and ${remainingSeconds} seconds...`);
                if (cooldownTime <= 0) {
                    clearInterval(interval);
                    setCooldownActive(false); // Disable cooldown
                    setCooldownMessage(""); // Clear cooldown message
                    localStorage.removeItem("cooldownEndTime"); // Remove cooldown from localStorage
                }
            }, 1000); // Update every second

            return () => clearInterval(interval); // Cleanup interval on unmount
        }
    }
}, []);

  return (
    <>
      <div className="animation-container">
          <h1>Welcome to KimochiYokatta.com</h1>
          <h2>Suzuka Clicker</h2>
          <button onClick={handleClick}>Kimochi Yokatta</button>
          <div className="click-info">
            <p>Clicks: {clickCount}</p>
            <p>Goal: 5,000,000 Clicks</p>
            <p>Reach the goal to unlock new features and improvements!</p>
          </div>
      </div>
      
      {/* Concert Video */}
      <section className="concert-highlights">
        <h2>Concert Highlights</h2>
        <p>(Click on the image to watch the video.)</p>
        <div className="concert-grid">
          {concerts.map((concert, index) => (
            <div key={index} className="concert-item">
              <img
                src={concert.image}
                alt={concert.name}
                onClick={() => window.open(concert.youtubeLink, '_blank')}
              />
              <p><strong>{concert.name}</strong></p>
            </div>
          ))}
        </div>
      </section>
      
      <div className="comment-title-container">
        <h2>Comments</h2>
      </div>
      <section className="comment-section">
        <div className="comment-rules-container">
          <div className="comment-rules">
          <h3>Please note:</h3>
          <ul>
            <li>Comments have a <strong>cooldown</strong> period of <strong>10 minutes.</strong></li>
            <li>Each comment is <strong>limited to 50 characters.</strong></li>
            <li>CAPTCHA verification is <strong>required</strong> before submitting a comment.</li>
            <li>Only the 30 most recent comments are displayed. Older comments will be removed.</li>
          </ul>
          <div className="comment-guidelines">
            <strong>Be kind and keep it friendly.</strong> Please avoid profanity, personal attacks, or content that targets others. Respectful comments make this space welcoming for everyone.
          </div>
        </div>
        </div>
        <div className="comment-input-container">
          <div className="comment-input">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => setShowRecaptcha(true)}
            placeholder="Write a comment..."
            disabled={cooldownActive}
          />
          <p>Character Count: {newComment.length}</p>
          {showRecaptcha && (
            <ReCAPTCHA
              className="recaptcha-container"
              sitekey="6LdjwPUrAAAAAI-rQETa9qhdlDBHeVmAFurjz9oc"
              onChange={handleCaptchaChange}
            />
          )}
          <button onClick={handleAddComment} disabled={cooldownActive}>
            {cooldownActive ? "Please Wait..." : "Add Comment"}
          </button>
          {cooldownActive && <p className="cooldown-message">{cooldownMessage}</p>}
        </div>
        <div ref={commentContainerRef} className="comment-list-container">
          {comments.map((comment, index) => (
            <Comment
              key={comment.id || index}
              username={comment.username}
              text={comment.text}
              timestamp={comment.timestamp}
            />
          ))}
        </div>
        </div>
      </section>
      
      {/* Site footer: contact & socials */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-text">
            <h3>Contact & Collaborate</h3>
            <p>If you have suggestions, commissions, or want a website built, feel free to reach out.</p>
          </div>
          <div className="social-links">
            {/* Add a small label to indicate this block contains socials */}
            <div className="socials-label">Socials</div>
            <a className="social-link" href="mailto:dev.vaan@proton.me">dev.vaan@proton.me</a>
            <a className="social-link" href="https://x.com/VaanAqua" target="_blank" rel="noreferrer">
              <img src={xPng} alt="X" className="social-icon" />
              <span className="social-text">@VaanAqua</span></a>
            <a className="social-link" href="https://github.com/Vaan236" target="_blank" rel="noreferrer">
              <img src={githubPng} alt="GitHub" className="social-icon" />
              <span className="social-text">GitHub</span>
            </a>
          </div>
        </div>
        <small className="footer-note">Thanks for visiting! I read all messages and welcome friendly feedback.</small>
      </footer>
    </>
  );
}

export default App;
