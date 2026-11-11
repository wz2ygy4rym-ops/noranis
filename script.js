// =====================================
// RAFIQ | رفيق
// Firebase + Authentication
// =====================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================
// إعدادات Firebase
// =====================================

const firebaseConfig = {
  apiKey: "AIzaSyAlUIv8iDd6M46nzxWE6pOFSbEpkccLBKI",
  authDomain: "rafiq-1f593.firebaseapp.com",
  projectId: "rafiq-1f593",
  storageBucket: "rafiq-1f593.firebasestorage.app",
  messagingSenderId: "715915479631",
  appId: "1:715915479631:web:e19cc6000c289210f9b83a",
  measurementId: "G-DCQ95P2NDT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================
// عناصر الصفحة
// =====================================

const $ = id => document.getElementById(id);

const authScreen = $("authScreen");
const appScreen = $("appScreen");

const authForm = $("authForm");
const authName = $("authName");
const authEmail = $("authEmail");
const authPassword = $("authPassword");
const authSubmit = $("authSubmit");
const googleBtn = $("googleBtn");
const forgotBtn = $("forgotBtn");
const authMessage = $("authMessage");

let authMode = "signup";
// =====================================
// متغيرات نظام الرومات
// =====================================

let currentUser = null;
let activeRoomId = null;

let roomsUnsubscribe = null;
let messagesUnsubscribe = null;
let requestsUnsubscribe = null;

// =====================================
// رسائل تسجيل الدخول
// =====================================

function showAuthMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setLoading(loading) {
  if (authSubmit) {
    authSubmit.disabled = loading;
    authSubmit.textContent = loading
      ? "جاري التنفيذ..."
      : authMode === "signup"
        ? "إنشاء الحساب"
        : "تسجيل الدخول";
  }

  if (googleBtn) googleBtn.disabled = loading;
}


// =====================================
// التبديل بين إنشاء الحساب والدخول
// =====================================

function switchAuthMode(mode) {
  authMode = mode;

  const signupTab = $("signupTab");
  const loginTab = $("loginTab");

  if (signupTab) {
    signupTab.classList.toggle("active", mode === "signup");
  }

  if (loginTab) {
    loginTab.classList.toggle("active", mode === "login");
  }

  if (authName) {
    authName.parentElement.style.display =
      mode === "signup" ? "" : "none";
  }

  if (authSubmit) {
    authSubmit.textContent =
      mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول";
  }

  showAuthMessage("");
}

if ($("signupTab")) {
  $("signupTab").addEventListener("click", () => {
    switchAuthMode("signup");
  });
}

if ($("loginTab")) {
  $("loginTab").addEventListener("click", () => {
    switchAuthMode("login");
  });
}


// =====================================
// حفظ بيانات المستخدم في Firestore
// =====================================

async function saveUserData(user, name = "") {
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    uid: user.uid,
    name: name || user.displayName || "مستخدم رفيق",
    email: user.email || "",
    updatedAt: serverTimestamp()
  }, { merge: true });
}


// =====================================
// إنشاء حساب بالبريد الإلكتروني
// =====================================

if (authForm) {
  authForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = authEmail.value.trim();
    const password = authPassword.value;
    const name = authName ? authName.value.trim() : "";

    if (!email || !password) {
      showAuthMessage("من فضلك اكتب البريد الإلكتروني وكلمة المرور.", true);
      return;
    }

    if (authMode === "signup" && !name) {
      showAuthMessage("من فضلك اكتب اسمك.", true);
      return;
    }

    if (password.length < 6) {
      showAuthMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", true);
      return;
    }

    setLoading(true);
    showAuthMessage("");

    try {
      if (authMode === "signup") {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await updateProfile(result.user, {
          displayName: name
        });

        await saveUserData(result.user, name);

        showAuthMessage("تم إنشاء الحساب بنجاح.");
      } else {
        const result = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        await saveUserData(result.user);
        showAuthMessage("تم تسجيل الدخول بنجاح.");
      }

    } catch (error) {
      console.error(error);

      const messages = {
        "auth/email-already-in-use": "هذا البريد مسجل بالفعل.",
        "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
        "auth/weak-password": "كلمة المرور ضعيفة.",
        "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
        "auth/wrong-password": "كلمة المرور غير صحيحة.",
        "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
        "auth/too-many-requests": "محاولات كثيرة. حاول مرة أخرى لاحقًا."
      };

      showAuthMessage(
        messages[error.code] || "حدث خطأ. حاول مرة أخرى.",
        true
      );

    } finally {
      setLoading(false);
    }
  });
}


// =====================================
// تسجيل الدخول باستخدام Google
// =====================================

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    setLoading(true);
    showAuthMessage("");

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      await saveUserData(result.user);

    } catch (error) {
      console.error(error);

      if (error.code === "auth/popup-closed-by-user") {
        showAuthMessage("تم إغلاق نافذة تسجيل الدخول.", true);
      } else if (error.code === "auth/unauthorized-domain") {
        showAuthMessage(
          "هذا النطاق غير مسموح. أضفه من إعدادات Firebase.",
          true
        );
      } else {
        showAuthMessage("تعذر تسجيل الدخول باستخدام Google.", true);
      }

    } finally {
      setLoading(false);
    }
  });
}


// =====================================
// استعادة كلمة المرور
// =====================================

if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = authEmail.value.trim();

    if (!email) {
      showAuthMessage(
        "اكتب بريدك الإلكتروني أولًا لاستعادة كلمة المرور.",
        true
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);

      showAuthMessage(
        "تم إرسال رابط استعادة كلمة المرور إلى بريدك."
      );

    } catch (error) {
      console.error(error);

      showAuthMessage(
        "تعذر إرسال الرابط. تأكد من صحة البريد الإلكتروني.",
        true
      );
    }
  });
}


// =====================================
// متابعة حالة تسجيل الدخول
// =====================================

onAuthStateChanged(auth, async user => {
  currentUser = user || null;
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    if ($("userGreeting")) {
      $("userGreeting").textContent =
        `مرحبًا، ${user.displayName || "بك"}`;
    }
try {
  await saveUserData(user);
  loadMyRooms();
} catch (error) {
  console.error("تعذر حفظ بيانات المستخدم:", error);
}

  } else {
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});


// =====================================
// تسجيل الخروج
// =====================================

if ($("logoutBtn")) {
  $("logoutBtn").addEventListener("click", async () => {
    const confirmed = confirm("هل تريد تسجيل الخروج؟");

    if (!confirmed) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      alert("تعذر تسجيل الخروج. حاول مرة أخرى.");
    }
  });
}


// =====================================
// التاريخ
// =====================================

function updateDate() {
  const now = new Date();

  const date = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(now);

  if ($("todayDate")) {
    $("todayDate").textContent = date;
  }
}


// =====================================
// مواقيت الصلاة
// =====================================

const prayerNames = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء"
};

const prayerSymbols = ["☾", "☀", "◈", "☼", "☾"];
const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

let prayerTimes = {};
let nextPrayer = null;
let countdownInterval = null;

function parsePrayerTime(time) {
  const [hour, minute] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date;
}

function renderPrayerList() {
  const now = new Date();

  const next = prayerKeys.find(key => {
    return parsePrayerTime(prayerTimes[key]) > now;
  });

  nextPrayer = next || "Fajr";

  if ($("prayerList")) {
    $("prayerList").innerHTML = prayerKeys.map((key, index) => {
      const active = key === nextPrayer;

      return `
        <div class="prayer-card ${active ? "active" : ""}">
          <div class="symbol">${prayerSymbols[index]}</div>
          <h3>${prayerNames[key]}</h3>
          <p>${prayerTimes[key]}</p>
        </div>
      `;
    }).join("");
  }

  if ($("nextPrayerName")) {
    $("nextPrayerName").textContent = prayerNames[nextPrayer];
  }

  startCountdown();
}

function startCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  function tick() {
    if (!prayerTimes[nextPrayer]) return;

    const now = new Date();
    let target = parsePrayerTime(prayerTimes[nextPrayer]);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const diff = Math.max(0, target - now);

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if ($("hours")) {
      $("hours").textContent = String(hours).padStart(2, "0");
    }

    if ($("minutes")) {
      $("minutes").textContent = String(minutes).padStart(2, "0");
    }

    if ($("seconds")) {
      $("seconds").textContent = String(seconds).padStart(2, "0");
    }

    if (diff <= 1000) {
      loadPrayerTimes();
    }
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function loadPrayerTimes() {
  if ($("locationLabel")) {
    $("locationLabel").textContent = "جاري تحميل مواقيت الصلاة...";
  }

  try {
    const response = await fetch(
      "https://api.aladhan.com/v1/timingsByCity?city=Minya&country=Egypt&method=5"
    );

    if (!response.ok) {
      throw new Error("Network error");
    }

    const result = await response.json();

    if (result.code !== 200) {
      throw new Error("Prayer API error");
    }

    const timings = result.data.timings;

    prayerKeys.forEach(key => {
      prayerTimes[key] = timings[key].slice(0, 5);
    });

    if ($("locationLabel")) {
      $("locationLabel").textContent = "المنيا، مصر";
    }

    renderPrayerList();

  } catch (error) {
    console.error(error);

    if ($("locationLabel")) {
      $("locationLabel").textContent =
        "تعذر تحميل المواقيت. تحقق من الإنترنت.";
    }

    if ($("prayerList")) {
      $("prayerList").innerHTML =
        '<div class="loading">تعذر تحميل مواقيت الصلاة</div>';
    }

    if ($("nextPrayerName")) {
      $("nextPrayerName").textContent = "غير متاح";
    }
  }
}


// =====================================
// الرسالة اليومية
// =====================================

if ($("dailyMessage")) {
  $("dailyMessage").textContent =
    "اجعل الصلاة نورًا يرافق يومك، وخطوة تقربك من الله.";
}


// =====================================
// القائمة السفلية
// =====================================

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    const section = button.dataset.section;

    if (section && section !== "home") {
      const names = {
        prayer: "متابعة الصلاة",
        quran: "القرآن الكريم",
        azkar: "الأذكار",
        profile: "الملف الشخصي"
      };

      alert(`قسم ${names[section] || section} سيتم تجهيزه في المرحلة التالية.`);
    }
  });
});


// =====================================
// تشغيل التطبيق
// =====================================

updateDate();
loadPrayerTimes();
// =====================================
// نظام الرومات - إنشاء وعرض الغرف
// =====================================

const newRoomName = $("newRoomName");
const newRoomCode = $("newRoomCode");
const createRoomBtn = $("createRoomBtn");
const roomCreateStatus = $("roomCreateStatus");
const myRoomsList = $("myRoomsList");

// إنشاء غرفة جديدة
if (createRoomBtn) {
  createRoomBtn.addEventListener("click", async () => {

    if (!currentUser) {
      roomCreateStatus.textContent = "سجّل الدخول أولًا.";
      return;
    }

    const name = newRoomName.value.trim();
    const code = newRoomCode.value.trim().toUpperCase();

    if (!name || !code) {
      roomCreateStatus.textContent =
        "اكتب اسم الغرفة وكود الدعوة.";
      return;
    }

    if (code.length < 4) {
      roomCreateStatus.textContent =
        "كود الدعوة يجب أن يكون 4 أحرف أو أكثر.";
      return;
    }

    createRoomBtn.disabled = true;
    roomCreateStatus.textContent = "جاري إنشاء الغرفة...";

    try {
      // التأكد أن كود الدعوة غير مستخدم
      const existingRooms = await getDocs(
        query(
          collection(db, "rooms"),
          where("inviteCode", "==", code)
        )
      );

      if (!existingRooms.empty) {
        roomCreateStatus.textContent =
          "كود الدعوة مستخدم بالفعل. اختر كودًا آخر.";
        return;
      }

      // حفظ الغرفة
      await addDoc(collection(db, "rooms"), {
        name: name,
        inviteCode: code,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || "صاحب الغرفة",
        memberIds: [currentUser.uid],
        createdAt: serverTimestamp()
      });

      roomCreateStatus.textContent =
        "تم إنشاء الغرفة بنجاح.";

      newRoomName.value = "";
      newRoomCode.value = "";

      loadMyRooms();

    } catch (error) {
      console.error("Room creation error:", error);

      roomCreateStatus.textContent =
        "تعذر إنشاء الغرفة. تحقق من اتصال Firebase وصلاحيات Firestore.";

    } finally {
      createRoomBtn.disabled = false;
    }
  });
}


// تحميل الغرف الخاصة بالمستخدم
function loadMyRooms() {

  if (!currentUser || !myRoomsList) return;

  if (roomsUnsubscribe) {
    roomsUnsubscribe();
  }

  myRoomsList.textContent = "جاري تحميل الغرف...";

  const roomsQuery = query(
    collection(db, "rooms"),
    where("memberIds", "array-contains", currentUser.uid)
  );

  roomsUnsubscribe = onSnapshot(
    roomsQuery,
    snapshot => {

      if (snapshot.empty) {
        myRoomsList.textContent =
          "لم تنضم إلى أي غرفة حتى الآن.";
        return;
      }

      myRoomsList.innerHTML = "";

      snapshot.forEach(roomDocument => {

        const room = roomDocument.data();

        const roomCard = document.createElement("div");
        roomCard.className = "feature-card";

        const roomTitle = document.createElement("h3");
        roomTitle.textContent = room.name || "غرفة بدون اسم";

        const roomOwner = document.createElement("p");
        roomOwner.textContent =
          "صاحب الغرفة: " + (room.ownerName || "غير معروف");

        roomCard.append(roomTitle, roomOwner);
        myRoomsList.appendChild(roomCard);

      });
    },

    error => {
      console.error("Rooms loading error:", error);

      myRoomsList.textContent =
        "تعذر تحميل الغرف. تحقق من صلاحيات Firestore.";
    }
  );
}
