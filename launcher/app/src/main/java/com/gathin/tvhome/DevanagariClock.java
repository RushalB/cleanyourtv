package com.gathin.tvhome;

import android.content.Context;
import android.util.AttributeSet;
import android.widget.TextClock;

/**
 * TextClock that automatically converts numeric digits into Devanagari numerals (०-९).
 */
public class DevanagariClock extends TextClock {

    public DevanagariClock(Context context) {
        super(context);
    }

    public DevanagariClock(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public DevanagariClock(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public DevanagariClock(Context context, AttributeSet attrs, int defStyleAttr, int defStyleRes) {
        super(context, attrs, defStyleAttr, defStyleRes);
    }

    @Override
    public void setText(CharSequence text, BufferType type) {
        if (text != null) {
            text = toDevanagari(text.toString());
        }
        super.setText(text, type);
    }

    public static String toDevanagari(String text) {
        if (text == null) return null;
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c >= '0' && c <= '9') {
                sb.append((char) ('\u0966' + (c - '0')));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
