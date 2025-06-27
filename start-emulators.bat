@echo off
echo.
echo =========================================
echo  Starting Firebase Emulators
echo =========================================
echo.
echo This will start the local Firebase services (Auth, Firestore, Storage).
echo Keep this window open while you are developing.
echo.
echo To stop the emulators, press Ctrl+C in this window.
echo.

firebase emulators:start --project demo-invoiceflow --import ./.firebase-data --export-on-exit

echo.
echo =========================================
echo  Firebase Emulators have been stopped.
echo =========================================
echo.
pause
