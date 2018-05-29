extwindow equ $4000

banks
dontuse
    org *+$100
bankindex
    dta 0
prepnextbank
    ldx bankindex
    lda banks,x
    sne:jmp main ; cancel load and run if banks are full
    sta PORTB
    inx
    stx bankindex
    sta rdscr+38
    rts

    ; destroys addresses 0, 4000, 8000, C000 on RAMBO 256K
    ; destroys first byte in every extended RAM bank and 4000 in main mem
detectram
    sei
    mva #0 NMIEN
    sta DMACTL

    ; clear dontuse table
    tax
    sta:rne dontuse,x+

    ; store 5A in every bank
    lda #$5A
l1
    stx PORTB
    sta extwindow
    :2 inx
    bne l1
    ; store 5A in address zero to detect RAMBO 256K
    sta 0

    ; loop through banks by X
l2
    ; skip if bank X has been marked as dont-use
    ldy dontuse,x
    bne c1

    ; write A5 into bank X
    stx PORTB
    mva #$A5 extwindow
    ; if address 0 contains A5 then mark as RAMBO 256K main mem alias
    cmp 0
    bne c0
    sta dontuse,x
    beq c1
c0

    ; loop through banks by Y = X+2 .. $FE
    txa
    tay
    :2 iny
l3
    sty PORTB
    ; if this bank contains A5 then mark as not unique
    lda #$A5
    cmp extwindow
    sne:sta dontuse,y
    :2 iny
    bne l3

    ; write 5A back into bank X
    stx PORTB
    mvy #$5A extwindow

c1
    :2 inx
    bne l2

    ; enumerate unique banks
    ldy #0
l4
    lda dontuse,x
    bne c2
    cpx #$10
    sne:ldx #$90 ; disable self-test in main ram bank
    txa
    ; set OS enable bit on all banks
    ora #1
    sta banks,y+
c2
    :2 inx
    bne l4
    ; terminate list with 0
    mva #0 banks,y
    jsr displaycount
    lda #0
    sta:rne banks,y+

    ; display loading message
    mwa #rddlist $230 ; SDLSTL
    mva #0 $2C6 ; COLOR2
    mva #15 $2C5 ; COLOR1
    lda:rne VCOUNT
    mva #$22 $22F ; SDMCTL

    ; restore OS ROM
    mva #$FF PORTB
    ; restore interrupts
    cli
    mva #$40 NMIEN

    rts

rddlist
    :5 dta $70
    dta $42,a(rdscr)
    dta $70
    dta $42,a(banks)
    dta $2
    dta $41,a(rddlist)
rdscr
    ;     0123456789012345678901234567890123456789
    dta d'    Loading into 00 detected banks...   '
displaycount
    tya
    ldx #0
divmod
    cmp #10
    bcc done
    sbc #10
    inx
    jmp divmod
done
    adc #16
    sta rdscr+18
    txa
    adc #16
    sta rdscr+17
    rts
