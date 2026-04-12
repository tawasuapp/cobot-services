import 'package:flutter/material.dart';

class IvdButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double minHeight;
  final double minWidth;
  final double fontSize;
  final bool expanded;
  final bool isLoading;

  const IvdButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.backgroundColor,
    this.foregroundColor,
    this.minHeight = 60,
    this.minWidth = 160,
    this.fontSize = 18,
    this.expanded = false,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    // While loading we ignore taps so repeated presses don't trigger duplicate
    // API calls. The visible spinner gives the operator immediate feedback.
    final effectiveOnPressed = isLoading ? null : onPressed;
    final button = ElevatedButton(
      onPressed: effectiveOnPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor ?? Theme.of(context).colorScheme.primary,
        foregroundColor: foregroundColor ?? Colors.white,
        minimumSize: Size(minWidth, minHeight),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        textStyle: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 4,
      ),
      child: Row(
        mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isLoading) ...[
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.4,
                valueColor: AlwaysStoppedAnimation(foregroundColor ?? Colors.white),
              ),
            ),
            const SizedBox(width: 12),
          ] else if (icon != null) ...[
            Icon(icon, size: 24),
            const SizedBox(width: 12),
          ],
          Text(isLoading ? 'Please wait…' : label),
        ],
      ),
    );

    if (expanded) {
      return SizedBox(
        width: double.infinity,
        height: minHeight,
        child: button,
      );
    }

    return button;
  }
}
